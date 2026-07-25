import React, { useEffect, useState } from 'react';
import { Box, Container, Typography } from '@mui/material';
import { MainLayout, Campaign } from './components';
import { useDeployedCampaignContext } from './hooks';
import { type CampaignDeployment } from './contexts';
import { type Observable } from 'rxjs';

const App: React.FC = () => {
  const campaignProvider = useDeployedCampaignContext();
  const [campaignDeployments, setCampaignDeployments] = useState<Array<Observable<CampaignDeployment>>>([]);

  useEffect(() => {
    const subscription = campaignProvider.campaignDeployments$.subscribe(setCampaignDeployments);
    return () => subscription.unsubscribe();
  }, [campaignProvider]);

  return (
    <Box sx={{ background: 'linear-gradient(180deg, #010409 0%, #0d1117 100%)', minHeight: '100vh' }}>
      <MainLayout>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Typography variant="h4" color="primary" gutterBottom sx={{ fontWeight: 700 }}>
            Midnight Crowdfunding
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 720 }}>
            Launch privacy-preserving crowdfunding campaigns on Midnight. Pledge amounts flow through
            private witnesses and are selectively disclosed to update public totals.
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 3,
              justifyContent: { xs: 'center', md: 'flex-start' },
            }}
          >
            {campaignDeployments.map((campaignDeployment$, idx) => (
              <div data-testid={`campaign-${idx}`} key={`campaign-${idx}`}>
                <Campaign campaignDeployment$={campaignDeployment$} />
              </div>
            ))}
            <div data-testid="campaign-start">
              <Campaign />
            </div>
          </Box>
        </Container>
      </MainLayout>
    </Box>
  );
};

export default App;
