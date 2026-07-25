import { useContext } from 'react';
import { DeployedCampaignContext } from '../contexts/DeployedCampaignContext';

export const useDeployedCampaignContext = () => {
  const context = useContext(DeployedCampaignContext);
  if (!context) {
    throw new Error('useDeployedCampaignContext must be used within DeployedCampaignProvider');
  }
  return context;
};
