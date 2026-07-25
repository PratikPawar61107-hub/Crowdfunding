import React, { useState } from 'react';
import { type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { CardActions, CardContent, IconButton, Tooltip, Typography } from '@mui/material';
import CampaignIcon from '@mui/icons-material/VolunteerActivismOutlined';
import CreateIcon from '@mui/icons-material/AddCircleOutlined';
import JoinIcon from '@mui/icons-material/AddLinkOutlined';
import { TextPromptDialog } from './TextPromptDialog';

export interface EmptyCardContentProps {
  onCreateCampaignCallback: () => void;
  onJoinCampaignCallback: (contractAddress: ContractAddress) => void;
}

export const EmptyCardContent: React.FC<Readonly<EmptyCardContentProps>> = ({
  onCreateCampaignCallback,
  onJoinCampaignCallback,
}) => {
  const [textPromptOpen, setTextPromptOpen] = useState(false);

  return (
    <React.Fragment>
      <CardContent>
        <Typography align="center" variant="h1" color="primary.dark">
          <CampaignIcon fontSize="large" />
        </Typography>
        <Typography align="center" variant="body2" color="primary.dark" sx={{ px: 2 }}>
          Deploy a new crowdfunding campaign or join an existing one using your contract address.
        </Typography>
      </CardContent>
      <CardActions disableSpacing sx={{ justifyContent: 'center', pb: 2 }}>
        <Tooltip title="Deploy new campaign contract">
          <IconButton data-testid="campaign-deploy-btn" onClick={onCreateCampaignCallback}>
            <CreateIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Join existing campaign">
          <IconButton
            data-testid="campaign-join-btn"
            onClick={() => {
              setTextPromptOpen(true);
            }}
          >
            <JoinIcon />
          </IconButton>
        </Tooltip>
      </CardActions>
      <TextPromptDialog
        prompt="Enter deployed contract address"
        isOpen={textPromptOpen}
        onCancel={() => {
          setTextPromptOpen(false);
        }}
        onSubmit={(text) => {
          setTextPromptOpen(false);
          onJoinCampaignCallback(text);
        }}
      />
    </React.Fragment>
  );
};
