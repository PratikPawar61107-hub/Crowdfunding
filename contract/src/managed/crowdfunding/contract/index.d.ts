import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export enum CampaignStatus { DRAFT = 0, ACTIVE = 1, FUNDED = 2, CLOSED = 3 }

export type Witnesses<PS> = {
  localSecretKey(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  pledgeAmount(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
}

export type ImpureCircuits<PS> = {
  launch(context: __compactRuntime.CircuitContext<PS>,
         titleInput_0: string,
         descriptionInput_0: string,
         goal_0: bigint,
         deadlineInput_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  contribute(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  withdraw(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  close(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  launch(context: __compactRuntime.CircuitContext<PS>,
         titleInput_0: string,
         descriptionInput_0: string,
         goal_0: bigint,
         deadlineInput_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  contribute(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  withdraw(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  close(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
  publicKey(sk_0: Uint8Array, domain_0: Uint8Array): Uint8Array;
}

export type Circuits<PS> = {
  launch(context: __compactRuntime.CircuitContext<PS>,
         titleInput_0: string,
         descriptionInput_0: string,
         goal_0: bigint,
         deadlineInput_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  contribute(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  withdraw(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  close(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  publicKey(context: __compactRuntime.CircuitContext<PS>,
            sk_0: Uint8Array,
            domain_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
}

export type Ledger = {
  readonly status: CampaignStatus;
  readonly title: string;
  readonly description: string;
  readonly fundingGoal: bigint;
  readonly totalRaised: bigint;
  readonly deadline: bigint;
  readonly backerCount: bigint;
  readonly creator: Uint8Array;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
