import { createInterface, type Interface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { WebSocket } from 'ws';
import {
  CrowdfundingAPI,
  type CrowdfundingDerivedState,
  crowdfundingPrivateStateKey,
  type CrowdfundingProviders,
  type DeployedCrowdfundingContract,
  type PrivateStateId,
} from '../../api/src/index';
import { type WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';
import { ledger, type Ledger, CampaignStatus } from '../../contract/src/managed/crowdfunding/contract/index.js';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { type Logger } from 'pino';
import { type Config, StandaloneConfig } from './config.js';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { assertIsContractAddress, toHex } from '@midnight-ntwrk/midnight-js-utils';
import { TestEnvironment } from '@midnight-ntwrk/testkit-js';
import { MidnightWalletProvider } from './midnight-wallet-provider';
import { randomBytes } from '../../api/src/utils';
import { unshieldedToken } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { syncWallet, waitForUnshieldedFunds } from './wallet-utils';
import { generateDust } from './generate-dust';
import { CrowdfundingPrivateState } from '../../contract/src/witnesses.js';

// @ts-expect-error: WebSocket for apollo
globalThis.WebSocket = WebSocket;

export const getCrowdfundingLedgerState = async (
  providers: CrowdfundingProviders,
  contractAddress: ContractAddress,
): Promise<Ledger | null> => {
  assertIsContractAddress(contractAddress);
  const contractState = await providers.publicDataProvider.queryContractState(contractAddress);
  return contractState != null ? ledger(contractState.data) : null;
};

const DEPLOY_OR_JOIN_QUESTION = `
You can do one of the following:
  1. Deploy a new crowdfunding contract
  2. Join an existing crowdfunding contract
  3. Exit
Which would you like to do? `;

const deployOrJoin = async (
  providers: CrowdfundingProviders,
  rli: Interface,
  logger: Logger,
): Promise<CrowdfundingAPI | null> => {
  while (true) {
    const choice = await rli.question(DEPLOY_OR_JOIN_QUESTION);
    switch (choice) {
      case '1': {
        const api = await CrowdfundingAPI.deploy(providers, logger);
        logger.info(`Deployed contract at address: ${api.deployedContractAddress}`);
        return api;
      }
      case '2': {
        const api = await CrowdfundingAPI.join(
          providers,
          await rli.question('What is the contract address (in hex)? '),
          logger,
        );
        logger.info(`Joined contract at address: ${api.deployedContractAddress}`);
        return api;
      }
      case '3':
        logger.info('Exiting...');
        return null;
      default:
        logger.error(`Invalid choice: ${choice}`);
    }
  }
};

const statusName = (status: CampaignStatus): string => {
  switch (status) {
    case CampaignStatus.DRAFT:
      return 'draft';
    case CampaignStatus.ACTIVE:
      return 'active';
    case CampaignStatus.FUNDED:
      return 'funded';
    case CampaignStatus.CLOSED:
      return 'closed';
    default:
      return 'unknown';
  }
};

const displayLedgerState = async (
  providers: CrowdfundingProviders,
  deployed: DeployedCrowdfundingContract,
  logger: Logger,
): Promise<void> => {
  const contractAddress = deployed.deployTxData.public.contractAddress;
  const ledgerState = await getCrowdfundingLedgerState(providers, contractAddress);
  if (ledgerState === null) {
    logger.info(`No crowdfunding contract at ${contractAddress}`);
    return;
  }
  logger.info(`Status: ${statusName(ledgerState.status)}`);
  logger.info(`Title: ${ledgerState.title}`);
  logger.info(`Raised: ${ledgerState.totalRaised} / ${ledgerState.fundingGoal}`);
  logger.info(`Backers: ${ledgerState.backerCount}`);
  logger.info(`Creator: ${toHex(ledgerState.creator)}`);
};

const displayPrivateState = async (providers: CrowdfundingProviders, logger: Logger): Promise<void> => {
  const privateState = await providers.privateStateProvider.get(crowdfundingPrivateStateKey);
  if (privateState === null) {
    logger.info('No crowdfunding private state');
  } else {
    logger.info(`Secret key: ${toHex(privateState.secretKey)}`);
    logger.info(`Pending pledge: ${privateState.pendingPledgeAmount.toString()}`);
  }
};

const displayDerivedState = (state: CrowdfundingDerivedState | undefined, logger: Logger) => {
  if (!state) {
    logger.info('No derived state available');
    return;
  }
  logger.info(`Status: ${statusName(state.status)}`);
  logger.info(`Title: ${state.title}`);
  logger.info(`Progress: ${state.progressPercent}% (${state.totalRaised}/${state.fundingGoal})`);
  logger.info(`Creator is you: ${state.isCreator}`);
};

const MAIN_LOOP_QUESTION = `
You can do one of the following:
  1. Launch campaign
  2. Contribute (pledge)
  3. Withdraw (creator, when funded)
  4. Close campaign (creator)
  5. Display ledger state
  6. Display private state
  7. Display derived state
  8. Exit
Which would you like to do? `;

const mainLoop = async (providers: CrowdfundingProviders, rli: Interface, logger: Logger): Promise<void> => {
  const api = await deployOrJoin(providers, rli, logger);
  if (api === null) return;

  let currentState: CrowdfundingDerivedState | undefined;
  const subscription = api.state$.subscribe({ next: (state) => (currentState = state) });

  try {
    while (true) {
      const choice = await rli.question(MAIN_LOOP_QUESTION);
      try {
        switch (choice) {
          case '1': {
            const title = await rli.question('Campaign title: ');
            const description = await rli.question('Description: ');
            const goal = await rli.question('Funding goal: ');
            const deadline = await rli.question('Deadline (unix timestamp): ');
            await api.launch(title, description, BigInt(goal), BigInt(deadline));
            break;
          }
          case '2': {
            const amount = await rli.question('Pledge amount: ');
            await api.contribute(BigInt(amount));
            break;
          }
          case '3':
            await api.withdraw();
            break;
          case '4':
            await api.close();
            break;
          case '5':
            await displayLedgerState(providers, api.deployedContract, logger);
            break;
          case '6':
            await displayPrivateState(providers, logger);
            break;
          case '7':
            displayDerivedState(currentState, logger);
            break;
          case '8':
            logger.info('Exiting...');
            return;
          default:
            logger.error(`Invalid choice: ${choice}`);
        }
      } catch (e) {
        logError(logger, e);
        logger.info('Returning to main menu...');
      }
    }
  } finally {
    subscription.unsubscribe();
  }
};

const GENESIS_MINT_WALLET_SEED = '0000000000000000000000000000000000000000000000000000000000000001';

const WALLET_LOOP_QUESTION = `
You can do one of the following:
  1. Build a fresh wallet
  2. Build wallet from a seed
  3. Exit
Which would you like to do? `;

const buildWallet = async (config: Config, rli: Interface, logger: Logger): Promise<string | undefined> => {
  if (config instanceof StandaloneConfig) {
    return GENESIS_MINT_WALLET_SEED;
  }
  while (true) {
    const choice = await rli.question(WALLET_LOOP_QUESTION);
    switch (choice) {
      case '1':
        return toHex(randomBytes(32));
      case '2':
        return await rli.question('Enter your wallet seed: ');
      case '3':
        logger.info('Exiting...');
        return undefined;
      default:
        logger.error(`Invalid choice: ${choice}`);
    }
  }
};

export const run = async (config: Config, testEnv: TestEnvironment, logger: Logger): Promise<void> => {
  const rli = createInterface({ input, output, terminal: true });
  const providersToBeStopped: MidnightWalletProvider[] = [];
  try {
    const envConfiguration = await testEnv.start();
    logger.info(`Environment started: ${JSON.stringify(envConfiguration)}`);
    const seed = await buildWallet(config, rli, logger);
    if (seed === undefined) return;

    const walletProvider = await MidnightWalletProvider.build(logger, envConfiguration, seed);
    providersToBeStopped.push(walletProvider);
    const walletFacade: WalletFacade = walletProvider.wallet;
    await walletProvider.start();

    const unshieldedState = await waitForUnshieldedFunds(logger, walletFacade, envConfiguration, unshieldedToken());
    const nightBalance = unshieldedState.balances[unshieldedToken().raw];
    if (nightBalance === undefined) {
      logger.info('No funds received, exiting...');
      return;
    }
    logger.info(`Your NIGHT wallet balance is: ${nightBalance}`);

    if (config.generateDust) {
      const dustGeneration = await generateDust(logger, seed, unshieldedState, walletFacade);
      if (dustGeneration) {
        logger.info(`Submitted dust generation registration transaction: ${dustGeneration}`);
        await syncWallet(logger, walletFacade);
      }
    }

    const zkConfigProvider = new NodeZkConfigProvider<'launch' | 'contribute' | 'withdraw' | 'close'>(
      config.zkConfigPath,
    );
    const providers: CrowdfundingProviders = {
      privateStateProvider: levelPrivateStateProvider<PrivateStateId, CrowdfundingPrivateState>({
        privateStateStoreName: config.privateStateStoreName,
        signingKeyStoreName: `${config.privateStateStoreName}-signing-keys`,
        privateStoragePasswordProvider: () => 'Crowdfunding-Test-2026!',
        accountId: seed,
      }),
      publicDataProvider: indexerPublicDataProvider(envConfiguration.indexer, envConfiguration.indexerWS),
      zkConfigProvider,
      proofProvider: httpClientProofProvider(envConfiguration.proofServer, zkConfigProvider),
      walletProvider,
      midnightProvider: walletProvider,
    };
    await mainLoop(providers, rli, logger);
  } catch (e) {
    logError(logger, e);
    logger.info('Exiting...');
  } finally {
    try {
      rli.close();
      rli.removeAllListeners();
    } catch (e) {
      logError(logger, e);
    } finally {
      for (const wallet of providersToBeStopped) {
        logger.info('Stopping wallet...');
        await wallet.stop();
      }
      if (testEnv) {
        logger.info('Stopping test environment...');
        await testEnv.shutdown();
      }
    }
  }
};

function logError(logger: Logger, e: unknown) {
  if (e instanceof Error) {
    logger.error(`Found error '${e.message}'`);
    logger.debug(`${e.stack}`);
  } else {
    logger.error('Found error (unknown type)');
  }
}
