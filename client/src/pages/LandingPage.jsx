import React from 'react';
import { Box, Typography, Button, Stack, Card, CardContent } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import LoginIcon from '@mui/icons-material/Login';
import CycloneIcon from '@mui/icons-material/Cyclone';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        background: `
          radial-gradient(circle at center,
            #666666 0%,
            #4a4a4a 50%,
            #333333 100%
          ),
          linear-gradient(45deg,
            rgba(255,255,255,0.1) 0%,
            rgba(255,255,255,0.05) 100%
          )
        `,
        backgroundBlend: 'overlay',
      }}
    >
      <Card 
        elevation={8}
        sx={{
          maxWidth: 900,
          width: '100%',
          py: 6,
          px: 4,
          background: 'white',
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          border: '3px solid #1976d2'
        }}
      >
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: 'center',
              textAlign: { xs: 'center', md: 'left' },
              gap: 6,
            }}
          >
            <CycloneIcon 
              sx={{ 
                fontSize: 160,
                color: 'black'
              }} 
            />

            <Box>
              <Typography variant="h3" component="h1" fontWeight={700} gutterBottom>
                The Black Hole
              </Typography>
              <Typography 
                variant="subtitle1" 
                color="text.secondary" 
                mb={4}
                sx={{ 
                  fontSize: '1.5rem',  // Bigger font size
                  fontStyle: 'italic'  // Italic style
                }}
              >
                Where procurement gravity pulls the best vendors in.
              </Typography>

              <Stack direction="row" spacing={2} justifyContent={{ xs: 'center', md: 'flex-start' }}>
                <Button
                  variant="contained"
                  startIcon={<RocketLaunchIcon />}
                  onClick={() => navigate('/register')}
                  sx={{
                    bgcolor: 'primary.main',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    }
                  }}
                >
                  Get Started
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<LoginIcon />}
                  onClick={() => navigate('/login')}
                  sx={{
                    borderColor: 'primary.main',
                    color: 'primary.main',
                    '&:hover': {
                      borderColor: 'primary.dark',
                      bgcolor: 'rgba(0, 0, 0, 0.04)',
                    }
                  }}
                >
                  Login
                </Button>
              </Stack>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default LandingPage;