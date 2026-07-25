/*
 * Private state and witness implementations for the crowdfunding contract.
 */

import { Ledger } from './managed/crowdfunding/contract/index.js';
import { WitnessContext } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';

export type CrowdfundingPrivateState = {
  readonly secretKey: Uint8Array;
  readonly pendingPledgeAmount: bigint;
};

export const createCrowdfundingPrivateState = (
  secretKey: Uint8Array,
  pendingPledgeAmount: bigint = 0n,
): CrowdfundingPrivateState => ({
  secretKey,
  pendingPledgeAmount,
});

export const witnesses = {
  localSecretKey: ({
    privateState,
  }: WitnessContext<Ledger, CrowdfundingPrivateState>): [CrowdfundingPrivateState, Uint8Array] => [
    privateState,
    privateState.secretKey,
  ],
  pledgeAmount: ({
    privateState,
  }: WitnessContext<Ledger, CrowdfundingPrivateState>): [CrowdfundingPrivateState, bigint] => [
    privateState,
    privateState.pendingPledgeAmount,
  ],
};
