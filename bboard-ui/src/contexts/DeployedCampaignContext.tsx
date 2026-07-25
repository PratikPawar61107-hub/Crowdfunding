import React, { type PropsWithChildren, createContext } from 'react';
import {
  type DeployedCampaignAPIProvider,
  BrowserDeployedCampaignManager,
} from './BrowserDeployedCampaignManager';
import { type Logger } from 'pino';

export const DeployedCampaignContext = createContext<DeployedCampaignAPIProvider | undefined>(undefined);

export type DeployedCampaignProviderProps = PropsWithChildren<{
  logger: Logger;
}>;

export const DeployedCampaignProvider: React.FC<Readonly<DeployedCampaignProviderProps>> = ({
  logger,
  children,
}) => (
  <DeployedCampaignContext.Provider value={new BrowserDeployedCampaignManager(logger)}>
    {children}
  </DeployedCampaignContext.Provider>
);

export type { CampaignDeployment } from './BrowserDeployedCampaignManager';
