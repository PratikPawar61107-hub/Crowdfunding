import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';

export * from './managed/crowdfunding/contract/index.js';
export * from './witnesses';

import * as ContractModule from './managed/crowdfunding/contract/index.js';
import * as Witnesses from './witnesses';

export const CompiledCrowdfundingContract = CompiledContract.make<
  ContractModule.Contract<Witnesses.CrowdfundingPrivateState>
>('Crowdfunding', ContractModule.Contract<Witnesses.CrowdfundingPrivateState>).pipe(
  CompiledContract.withWitnesses(Witnesses.witnesses),
  CompiledContract.withCompiledFileAssets('./managed/crowdfunding'),
);
