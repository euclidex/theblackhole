import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button, Typography, Alert,
  Stack 
} from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';

const LoginPage = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    // Check for message in URL
    const params = new URLSearchParams(window.location.search);
    const message = params.get('message');
    if (message) {
      setError(message);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log('Attempting login with:', { email, password: '***' });
      const res = await axios.post('http://localhost:5001/login', { email, password });
      const { token, role, name } = res.data;
      
      console.log('Login response data:', { token: '...', role, name });
      
      // Store token in localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('userName', name);
      
      console.log('Stored in localStorage:', {
        token: localStorage.getItem('token') ? 'present' : 'missing',
        userName: localStorage.getItem('userName')
      });
      
      // Redirect based on role
      if (role === 'procurement') {
        console.log('Redirecting to officer dashboard');
        navigate('/officer-dashboard');
      } else if (role === 'vendor') {
        console.log('Redirecting to vendor dashboard');
        navigate('/vendor-dashboard');
      } else {
        console.warn('Unknown role:', role);
      }
    } catch (err) {
      console.error('Login error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    }
  };

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
          maxWidth: 400,
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
          <Typography variant="h4" component="h1" gutterBottom textAlign="center" fontWeight={700}>
            Login
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Stack spacing={3}>
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
            />
            <Button
              variant="contained"
              size="large"
              onClick={handleSubmit}
              startIcon={<LoginIcon />}
            >
              Login
            </Button>
            <Button
              variant="text"
              onClick={() => navigate('/register')}
            >
              Don't have an account? Register
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default LoginPage;