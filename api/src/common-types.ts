/**
 * Crowdfunding common types and abstractions.
 *
 * @module
 */

import { type MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import { type FoundContract } from '@midnight-ntwrk/midnight-js-contracts';
import type { CampaignStatus, CrowdfundingPrivateState, Contract, Witnesses } from '../../contract/src/index';

export const crowdfundingPrivateStateKey = 'crowdfundingPrivateState';
export type PrivateStateId = typeof crowdfundingPrivateStateKey;

export type PrivateStates = {
  readonly crowdfundingPrivateState: CrowdfundingPrivateState;
};

export type CrowdfundingContract = Contract<CrowdfundingPrivateState, Witnesses<CrowdfundingPrivateState>>;

export type CrowdfundingCircuitKeys = Exclude<keyof CrowdfundingContract['impureCircuits'], number | symbol>;

export type CrowdfundingProviders = MidnightProviders<
  CrowdfundingCircuitKeys,
  PrivateStateId,
  CrowdfundingPrivateState
>;

export type DeployedCrowdfundingContract = FoundContract<CrowdfundingContract>;

export type CrowdfundingDerivedState = {
  readonly status: CampaignStatus;
  readonly title: string;
  readonly description: string;
  readonly fundingGoal: bigint;
  readonly totalRaised: bigint;
  readonly deadline: bigint;
  readonly backerCount: bigint;
  readonly isCreator: boolean;
  readonly progressPercent: number;
};

export const CONTRACT_ADDRESS = '<YOUR_DEPLOYED_CONTRACT_ADDRESS>';
