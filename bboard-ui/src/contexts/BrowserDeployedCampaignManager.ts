// This file is part of the Midnight Crowdfunding DApp.

import {
  CrowdfundingAPI,
  type CrowdfundingCircuitKeys,
  type CrowdfundingProviders,
  type DeployedCrowdfundingAPI,
  CONTRACT_ADDRESS,
} from '../../../api/src/index';
import { type ContractAddress, fromHex, toHex } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import {
  BehaviorSubject,
  catchError,
  concatMap,
  filter,
  firstValueFrom,
  interval,
  map,
  type Observable,
  take,
  throwError,
  timeout,
} from 'rxjs';
import { pipe as fnPipe } from 'fp-ts/function';
import { type Logger } from 'pino';
import { ConnectedAPI, type InitialAPI } from '@midnight-ntwrk/dapp-connector-api';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import semver from 'semver';
import {
  Binding,
  FinalizedTransaction,
  Proof,
  SignatureEnabled,
  Transaction,
  TransactionId,
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { CrowdfundingPrivateState } from '@midnight-ntwrk/crowdfunding-contract';
import { inMemoryPrivateStateProvider } from '../in-memory-private-state-provider';
import { NetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import type { UnboundTransaction } from '@midnight-ntwrk/midnight-js-types';

export interface InProgressCampaignDeployment {
  readonly status: 'in-progress';
}

export interface DeployedCampaignDeployment {
  readonly status: 'deployed';
  readonly api: DeployedCrowdfundingAPI;
}

export interface FailedCampaignDeployment {
  readonly status: 'failed';
  readonly error: Error;
}

export type CampaignDeployment = InProgressCampaignDeployment | DeployedCampaignDeployment | FailedCampaignDeployment;

export interface DeployedCampaignAPIProvider {
  readonly campaignDeployments$: Observable<Array<Observable<CampaignDeployment>>>;
  readonly resolve: (contractAddress?: ContractAddress) => Observable<CampaignDeployment>;
}

export class BrowserDeployedCampaignManager implements DeployedCampaignAPIProvider {
  readonly #campaignDeploymentsSubject: BehaviorSubject<Array<BehaviorSubject<CampaignDeployment>>>;
  #initializedProviders: Promise<CrowdfundingProviders> | undefined;

  constructor(private readonly logger: Logger) {
    this.#campaignDeploymentsSubject = new BehaviorSubject<Array<BehaviorSubject<CampaignDeployment>>>([]);
    this.campaignDeployments$ = this.#campaignDeploymentsSubject;
  }

  readonly campaignDeployments$: Observable<Array<Observable<CampaignDeployment>>>;

  resolve(contractAddress?: ContractAddress): Observable<CampaignDeployment> {
    const address =
      contractAddress ??
      (import.meta.env.VITE_CONTRACT_ADDRESS !== '<YOUR_DEPLOYED_CONTRACT_ADDRESS>'
        ? (import.meta.env.VITE_CONTRACT_ADDRESS as ContractAddress)
        : undefined);

    const deployments = this.#campaignDeploymentsSubject.value;
    const existing = deployments.find(
      (deployment) =>
        deployment.value.status === 'deployed' && deployment.value.api.deployedContractAddress === address,
    );

    if (existing) {
      return existing;
    }

    const deployment = new BehaviorSubject<CampaignDeployment>({ status: 'in-progress' });

    if (address) {
      void this.joinDeployment(deployment, address);
    } else {
      void this.deployDeployment(deployment);
    }

    this.#campaignDeploymentsSubject.next([...deployments, deployment]);
    return deployment;
  }

  private getProviders(): Promise<CrowdfundingProviders> {
    return this.#initializedProviders ?? (this.#initializedProviders = initializeProviders(this.logger));
  }

  private async deployDeployment(deployment: BehaviorSubject<CampaignDeployment>): Promise<void> {
    try {
      const providers = await this.getProviders();
      const api = await CrowdfundingAPI.deploy(providers, this.logger);
      deployment.next({ status: 'deployed', api });
    } catch (error: unknown) {
      deployment.next({
        status: 'failed',
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  private async joinDeployment(
    deployment: BehaviorSubject<CampaignDeployment>,
    contractAddress: ContractAddress,
  ): Promise<void> {
    try {
      const providers = await this.getProviders();
      const api = await CrowdfundingAPI.join(providers, contractAddress, this.logger);
      deployment.next({ status: 'deployed', api });
    } catch (error: unknown) {
      deployment.next({
        status: 'failed',
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }
}

export { CONTRACT_ADDRESS };

const initializeProviders = async (logger: Logger): Promise<CrowdfundingProviders> => {
  const networkId = import.meta.env.VITE_NETWORK_ID as NetworkId;
  const connectedAPI = await connectToWallet(logger, networkId);
  const zkConfigPath = window.location.origin;
  const keyMaterialProvider = new FetchZkConfigProvider<CrowdfundingCircuitKeys>(zkConfigPath, fetch.bind(window));
  const config = await connectedAPI.getConfiguration();
  const inMemoryProvider = inMemoryPrivateStateProvider<string, CrowdfundingPrivateState>();
  const shieldedAddresses = await connectedAPI.getShieldedAddresses();
  return {
    privateStateProvider: inMemoryProvider,
    zkConfigProvider: keyMaterialProvider,
    proofProvider: httpClientProofProvider(config.proverServerUri!, keyMaterialProvider),
    publicDataProvider: indexerPublicDataProvider(config.indexerUri, config.indexerWsUri),
    walletProvider: {
      getCoinPublicKey(): string {
        return shieldedAddresses.shieldedCoinPublicKey;
      },
      getEncryptionPublicKey(): string {
        return shieldedAddresses.shieldedEncryptionPublicKey;
      },
      balanceTx: async (tx: UnboundTransaction, ttl?: Date): Promise<FinalizedTransaction> => {
        const serializedTx = toHex(tx.serialize());
        const received = await connectedAPI.balanceUnsealedTransaction(serializedTx);
        return Transaction.deserialize<SignatureEnabled, Proof, Binding>(
          'signature',
          'proof',
          'binding',
          fromHex(received.tx),
        );
      },
    },
    midnightProvider: {
      submitTx: async (tx: FinalizedTransaction): Promise<TransactionId> => {
        await connectedAPI.submitTransaction(toHex(tx.serialize()));
        const txIdentifiers = tx.identifiers();
        logger.info({ txIdentifiers }, 'Submitted transaction via wallet');
        return txIdentifiers[0];
      },
    },
  };
};

const getFirstCompatibleWallet = (): InitialAPI | undefined => {
  if (!window.midnight) return undefined;
  return Object.values(window.midnight).find(
    (wallet): wallet is InitialAPI =>
      !!wallet &&
      typeof wallet === 'object' &&
      'apiVersion' in wallet &&
      semver.satisfies(wallet.apiVersion, COMPATIBLE_CONNECTOR_API_VERSION),
  );
};

const COMPATIBLE_CONNECTOR_API_VERSION = '4.x';

const connectToWallet = (logger: Logger, networkId: string): Promise<ConnectedAPI> => {
  return firstValueFrom(
    fnPipe(
      interval(100),
      map(() => getFirstCompatibleWallet()),
      filter((connectorAPI): connectorAPI is InitialAPI => !!connectorAPI),
      take(1),
      timeout({
        first: 1_000,
        with: () =>
          throwError(() => new Error('Could not find Midnight Lace wallet. Extension installed?')),
      }),
      concatMap(async (initialAPI) => initialAPI.connect(networkId)),
      timeout({
        first: 5_000,
        with: () =>
          throwError(() => new Error('Midnight Lace wallet has failed to respond. Extension enabled?')),
      }),
      catchError((error) => throwError(() => error)),
    ),
  );
};
