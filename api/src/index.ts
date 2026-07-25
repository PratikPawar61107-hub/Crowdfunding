/**
 * Provides types and utilities for working with crowdfunding contracts.
 *
 * @packageDocumentation
 */

import * as Crowdfunding from '../../contract/src/managed/crowdfunding/contract/index.js';

import { type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { type Logger } from 'pino';
import {
  type CrowdfundingDerivedState,
  type CrowdfundingContract,
  type CrowdfundingProviders,
  type DeployedCrowdfundingContract,
  crowdfundingPrivateStateKey,
} from './common-types.js';
import { CompiledCrowdfundingContract } from '../../contract/src/index';
import * as utils from './utils/index.js';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { combineLatest, map, tap, from, type Observable } from 'rxjs';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';
import {
  CrowdfundingPrivateState,
  createCrowdfundingPrivateState,
} from '../../contract/src/witnesses.js';

export interface DeployedCrowdfundingAPI {
  readonly deployedContractAddress: ContractAddress;
  readonly state$: Observable<CrowdfundingDerivedState>;

  launch: (title: string, description: string, fundingGoal: bigint, deadline: bigint) => Promise<void>;
  contribute: (amount: bigint) => Promise<void>;
  withdraw: () => Promise<void>;
  close: () => Promise<void>;
}

export class CrowdfundingAPI implements DeployedCrowdfundingAPI {
  private constructor(
    public readonly deployedContract: DeployedCrowdfundingContract,
    private readonly providers: CrowdfundingProviders,
    private readonly logger?: Logger,
  ) {
    this.deployedContractAddress = deployedContract.deployTxData.public.contractAddress;
    providers.privateStateProvider.setContractAddress(this.deployedContractAddress);
    this.state$ = combineLatest(
      [
        providers.publicDataProvider
          .contractStateObservable(this.deployedContractAddress, { type: 'latest' })
          .pipe(
            map((contractState) => Crowdfunding.ledger(contractState.data)),
            tap((ledgerState) =>
              logger?.trace({
                ledgerStateChanged: {
                  ledgerState: {
                    status: ledgerState.status,
                    title: ledgerState.title,
                    totalRaised: ledgerState.totalRaised.toString(),
                    backerCount: ledgerState.backerCount.toString(),
                    creator: toHex(ledgerState.creator),
                  },
                },
              }),
            ),
          ),
        from(
          providers.privateStateProvider.get(crowdfundingPrivateStateKey) as Promise<CrowdfundingPrivateState>,
        ),
      ],
      (ledgerState, privateState) => {
        const creatorKey = Crowdfunding.pureCircuits.publicKey(
          privateState.secretKey,
          utils.padBytes(32, 'crowdfunding:creator'),
        );
        const goal = ledgerState.fundingGoal;
        const raised = ledgerState.totalRaised;
        const progressPercent =
          goal > 0n ? Math.min(100, Number((raised * 100n) / goal)) : 0;

        return {
          status: ledgerState.status,
          title: ledgerState.title,
          description: ledgerState.description,
          fundingGoal: goal,
          totalRaised: raised,
          deadline: ledgerState.deadline,
          backerCount: ledgerState.backerCount,
          isCreator: toHex(ledgerState.creator) === toHex(creatorKey),
          progressPercent,
        };
      },
    );
  }

  readonly deployedContractAddress: ContractAddress;
  readonly state$: Observable<CrowdfundingDerivedState>;

  async launch(
    title: string,
    description: string,
    fundingGoal: bigint,
    deadline: bigint,
  ): Promise<void> {
    this.logger?.info({ title, fundingGoal: fundingGoal.toString() }, 'launchingCampaign');
    const txData = await this.deployedContract.callTx.launch(title, description, fundingGoal, deadline);
    this.logger?.trace({
      transactionAdded: {
        circuit: 'launch',
        txHash: txData.public.txHash,
        blockHeight: txData.public.blockHeight,
      },
    });
  }

  async contribute(amount: bigint): Promise<void> {
    this.logger?.info({ amount: amount.toString() }, 'contributingToCampaign');
    const existing = (await this.providers.privateStateProvider.get(crowdfundingPrivateStateKey)) as
      | CrowdfundingPrivateState
      | null;
    const secretKey = existing?.secretKey ?? utils.randomBytes(32);
    await this.providers.privateStateProvider.set(crowdfundingPrivateStateKey, {
      secretKey,
      pendingPledgeAmount: amount,
    });
    const txData = await this.deployedContract.callTx.contribute();
    this.logger?.trace({
      transactionAdded: {
        circuit: 'contribute',
        txHash: txData.public.txHash,
        blockHeight: txData.public.blockHeight,
      },
    });
  }

  async withdraw(): Promise<void> {
    this.logger?.info('withdrawingFunds');
    const txData = await this.deployedContract.callTx.withdraw();
    this.logger?.trace({
      transactionAdded: {
        circuit: 'withdraw',
        txHash: txData.public.txHash,
        blockHeight: txData.public.blockHeight,
      },
    });
  }

  async close(): Promise<void> {
    this.logger?.info('closingCampaign');
    const txData = await this.deployedContract.callTx.close();
    this.logger?.trace({
      transactionAdded: {
        circuit: 'close',
        txHash: txData.public.txHash,
        blockHeight: txData.public.blockHeight,
      },
    });
  }

  static async deploy(providers: CrowdfundingProviders, logger?: Logger): Promise<CrowdfundingAPI> {
    logger?.info('deployContract');
    const deployed = await deployContract(providers, {
      compiledContract: CompiledCrowdfundingContract,
      privateStateId: crowdfundingPrivateStateKey,
      initialPrivateState: createCrowdfundingPrivateState(utils.randomBytes(32)),
    });
    logger?.trace({
      contractDeployed: {
        finalizedDeployTxData: deployed.deployTxData.public,
      },
    });
    return new CrowdfundingAPI(deployed, providers, logger);
  }

  static async join(
    providers: CrowdfundingProviders,
    contractAddress: ContractAddress,
    logger?: Logger,
  ): Promise<CrowdfundingAPI> {
    logger?.info({ joinContract: { contractAddress } });
    const deployed = await findDeployedContract<CrowdfundingContract>(providers, {
      contractAddress,
      compiledContract: CompiledCrowdfundingContract,
      privateStateId: crowdfundingPrivateStateKey,
      initialPrivateState: await CrowdfundingAPI.getPrivateState(providers, contractAddress),
    });
    logger?.trace({
      contractJoined: {
        finalizedDeployTxData: deployed.deployTxData.public,
      },
    });
    return new CrowdfundingAPI(deployed, providers, logger);
  }

  private static async getPrivateState(
    providers: CrowdfundingProviders,
    contractAddress: ContractAddress,
  ): Promise<CrowdfundingPrivateState> {
    providers.privateStateProvider.setContractAddress(contractAddress);
    const existing = await providers.privateStateProvider.get(crowdfundingPrivateStateKey);
    return existing ?? createCrowdfundingPrivateState(utils.randomBytes(32));
  }
}

export * as utils from './utils/index.js';
export * from './common-types.js';
