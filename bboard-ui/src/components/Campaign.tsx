import React, { useCallback, useEffect, useState } from 'react';
import { type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import {
  Backdrop,
  Box,
  Button,
  CircularProgress,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  IconButton,
  LinearProgress,
  Skeleton,
  TextField,
  Typography,
  Chip,
} from '@mui/material';
import CopyIcon from '@mui/icons-material/ContentPasteOutlined';
import StopIcon from '@mui/icons-material/HighlightOffOutlined';
import RocketIcon from '@mui/icons-material/RocketLaunchOutlined';
import FavoriteIcon from '@mui/icons-material/FavoriteOutlined';
import { type CrowdfundingDerivedState, type DeployedCrowdfundingAPI } from '../../../api/src/index';
import { CampaignStatus } from '../../../contract/src/index';
import { useDeployedCampaignContext } from '../hooks';
import { type CampaignDeployment } from '../contexts';
import { type Observable } from 'rxjs';
import { EmptyCardContent } from './Campaign.EmptyCardContent';

export interface CampaignProps {
  campaignDeployment$?: Observable<CampaignDeployment>;
}

const statusLabel = (status: CampaignStatus): string => {
  switch (status) {
    case CampaignStatus.DRAFT:
      return 'Draft';
    case CampaignStatus.ACTIVE:
      return 'Active';
    case CampaignStatus.FUNDED:
      return 'Funded';
    case CampaignStatus.CLOSED:
      return 'Closed';
    default:
      return 'Unknown';
  }
};

export const Campaign: React.FC<Readonly<CampaignProps>> = ({ campaignDeployment$ }) => {
  const campaignProvider = useDeployedCampaignContext();
  const [campaignDeployment, setCampaignDeployment] = useState<CampaignDeployment>();
  const [deployedApi, setDeployedApi] = useState<DeployedCrowdfundingAPI>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [campaignState, setCampaignState] = useState<CrowdfundingDerivedState>();
  const [isWorking, setIsWorking] = useState(!!campaignDeployment$);

  const [launchTitle, setLaunchTitle] = useState('');
  const [launchDescription, setLaunchDescription] = useState('');
  const [launchGoal, setLaunchGoal] = useState('');
  const [launchDeadline, setLaunchDeadline] = useState('');
  const [pledgeAmount, setPledgeAmount] = useState('');

  const onCreateCampaign = useCallback(() => campaignProvider.resolve(), [campaignProvider]);
  const onJoinCampaign = useCallback(
    (contractAddress: ContractAddress) => campaignProvider.resolve(contractAddress),
    [campaignProvider],
  );

  const runAction = useCallback(
    async (action: () => Promise<void>) => {
      try {
        setIsWorking(true);
        setErrorMessage(undefined);
        await action();
      } catch (error: unknown) {
        setErrorMessage(error instanceof Error ? error.message : String(error));
      } finally {
        setIsWorking(false);
      }
    },
    [],
  );

  const onLaunch = useCallback(async () => {
    if (!deployedApi || !launchTitle || !launchGoal) return;
    await runAction(() =>
      deployedApi.launch(
        launchTitle,
        launchDescription,
        BigInt(launchGoal),
        BigInt(launchDeadline || Math.floor(Date.now() / 1000 + 86400 * 30).toString()),
      ),
    );
  }, [deployedApi, launchTitle, launchDescription, launchGoal, launchDeadline, runAction]);

  const onContribute = useCallback(async () => {
    if (!deployedApi || !pledgeAmount) return;
    await runAction(() => deployedApi.contribute(BigInt(pledgeAmount)));
  }, [deployedApi, pledgeAmount, runAction]);

  const onWithdraw = useCallback(async () => {
    if (!deployedApi) return;
    await runAction(() => deployedApi.withdraw());
  }, [deployedApi, runAction]);

  const onClose = useCallback(async () => {
    if (!deployedApi) return;
    await runAction(() => deployedApi.close());
  }, [deployedApi, runAction]);

  const onCopyContractAddress = useCallback(async () => {
    if (deployedApi) {
      await navigator.clipboard.writeText(deployedApi.deployedContractAddress);
    }
  }, [deployedApi]);

  useEffect(() => {
    if (!campaignDeployment$) return;
    const subscription = campaignDeployment$.subscribe(setCampaignDeployment);
    return () => subscription.unsubscribe();
  }, [campaignDeployment$]);

  useEffect(() => {
    if (!campaignDeployment || campaignDeployment.status === 'in-progress') return;
    setIsWorking(false);
    if (campaignDeployment.status === 'failed') {
      setErrorMessage(
        campaignDeployment.error.message.length
          ? campaignDeployment.error.message
          : 'Encountered an unexpected error.',
      );
      return;
    }
    setDeployedApi(campaignDeployment.api);
    const subscription = campaignDeployment.api.state$.subscribe(setCampaignState);
    return () => subscription.unsubscribe();
  }, [campaignDeployment]);

  return (
    <Card
      sx={{
        position: 'relative',
        width: { xs: '100%', sm: 420 },
        minWidth: 320,
        background: 'linear-gradient(145deg, #0d1117 0%, #161b22 100%)',
        border: '1px solid #30363d',
      }}
    >
      {!campaignDeployment$ && (
        <EmptyCardContent
          onCreateCampaignCallback={onCreateCampaign}
          onJoinCampaignCallback={onJoinCampaign}
        />
      )}

      {campaignDeployment$ && (
        <React.Fragment>
          <Backdrop
            sx={{ position: 'absolute', color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
            open={isWorking}
          >
            <CircularProgress data-testid="campaign-working-indicator" />
          </Backdrop>
          <Backdrop
            sx={{
              position: 'absolute',
              color: '#ff6b6b',
              zIndex: (theme) => theme.zIndex.drawer + 1,
              flexDirection: 'column',
              gap: 1,
              px: 2,
            }}
            open={!!errorMessage}
            onClick={() => setErrorMessage(undefined)}
          >
            <StopIcon fontSize="large" />
            <Typography data-testid="campaign-error-message" align="center">
              {errorMessage}
            </Typography>
          </Backdrop>

          <CardHeader
            title={
              campaignState?.title ||
              toShortFormatContractAddress(deployedApi?.deployedContractAddress) ||
              'Loading campaign...'
            }
            subheader={
              campaignState ? (
                <Chip
                  size="small"
                  label={statusLabel(campaignState.status)}
                  color={
                    campaignState.status === CampaignStatus.ACTIVE
                      ? 'success'
                      : campaignState.status === CampaignStatus.FUNDED
                        ? 'primary'
                        : 'default'
                  }
                />
              ) : (
                <Skeleton width={80} />
              )
            }
            action={
              deployedApi?.deployedContractAddress ? (
                <IconButton title="Copy contract address" onClick={onCopyContractAddress}>
                  <CopyIcon fontSize="small" />
                </IconButton>
              ) : undefined
            }
          />

          <CardContent>
            {!campaignState ? (
              <Skeleton variant="rectangular" height={200} />
            ) : campaignState.status === CampaignStatus.DRAFT ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Launch your campaign on-chain. Creator identity stays private until disclosed.
                </Typography>
                <TextField
                  label="Title"
                  size="small"
                  fullWidth
                  value={launchTitle}
                  onChange={(e) => setLaunchTitle(e.target.value)}
                />
                <TextField
                  label="Description"
                  size="small"
                  fullWidth
                  multiline
                  minRows={3}
                  value={launchDescription}
                  onChange={(e) => setLaunchDescription(e.target.value)}
                />
                <TextField
                  label="Funding goal (tokens)"
                  size="small"
                  type="number"
                  fullWidth
                  value={launchGoal}
                  onChange={(e) => setLaunchGoal(e.target.value)}
                />
                <TextField
                  label="Deadline (Unix timestamp)"
                  size="small"
                  type="number"
                  fullWidth
                  value={launchDeadline}
                  onChange={(e) => setLaunchDeadline(e.target.value)}
                  placeholder={String(Math.floor(Date.now() / 1000 + 86400 * 30))}
                />
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  {campaignState.description || 'No description provided.'}
                </Typography>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption">
                      {campaignState.totalRaised.toString()} / {campaignState.fundingGoal.toString()} raised
                    </Typography>
                    <Typography variant="caption">{campaignState.progressPercent}%</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={campaignState.progressPercent}
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {campaignState.backerCount.toString()} backer(s) · Deadline:{' '}
                  {new Date(Number(campaignState.deadline) * 1000).toLocaleDateString()}
                </Typography>
                {campaignState.status === CampaignStatus.ACTIVE && (
                  <TextField
                    label="Your pledge amount"
                    size="small"
                    type="number"
                    fullWidth
                    value={pledgeAmount}
                    onChange={(e) => setPledgeAmount(e.target.value)}
                    helperText="Amount is held in private state until disclosed on-chain"
                  />
                )}
              </Box>
            )}
          </CardContent>

          <CardActions sx={{ px: 2, pb: 2, flexWrap: 'wrap', gap: 1 }}>
            {campaignState?.status === CampaignStatus.DRAFT && (
              <Button
                variant="contained"
                startIcon={<RocketIcon />}
                disabled={!launchTitle || !launchGoal}
                onClick={onLaunch}
              >
                Launch campaign
              </Button>
            )}
            {campaignState?.status === CampaignStatus.ACTIVE && (
              <>
                <Button
                  variant="contained"
                  startIcon={<FavoriteIcon />}
                  disabled={!pledgeAmount}
                  onClick={onContribute}
                >
                  Back this project
                </Button>
                {campaignState.isCreator && (
                  <Button variant="outlined" color="warning" onClick={onClose}>
                    Close campaign
                  </Button>
                )}
              </>
            )}
            {campaignState?.status === CampaignStatus.FUNDED && campaignState.isCreator && (
              <Button variant="contained" color="success" onClick={onWithdraw}>
                Withdraw funds
              </Button>
            )}
          </CardActions>
        </React.Fragment>
      )}
    </Card>
  );
};

const toShortFormatContractAddress = (contractAddress: ContractAddress | undefined): string | undefined =>
  contractAddress
    ? `0x${contractAddress.replace(/^[A-Fa-f0-9]{6}([A-Fa-f0-9]{8}).*([A-Fa-f0-9]{8})$/g, '$1...$2')}`
    : undefined;
