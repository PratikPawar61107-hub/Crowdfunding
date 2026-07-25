import React from 'react';
import { AppBar, Box, Typography } from '@mui/material';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';

export const Header: React.FC = () => (
  <AppBar
    position="static"
    data-testid="header"
    sx={{
      backgroundColor: 'transparent',
      boxShadow: 'none',
      borderBottom: '1px solid #30363d',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}
  >
    <Box sx={{ display: 'flex', px: { xs: 2, md: 6 }, py: 2, alignItems: 'center', gap: 1.5 }}>
      <VolunteerActivismIcon color="primary" fontSize="large" />
      <Typography variant="h6" color="primary" sx={{ fontWeight: 700 }}>
        Midnight Crowdfunding
      </Typography>
    </Box>
  </AppBar>
);
