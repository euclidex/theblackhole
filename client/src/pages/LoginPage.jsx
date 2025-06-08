import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button, Typography, Alert,
  Stack 
} from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';
import config from '../config';

const LoginPage = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
    setIsLoading(true);
    setError('');

    try {
      console.log('Attempting login with:', { email, password: '***' });
      console.log('Login URL:', `${config.API_URL}/auth/login`);
      
      const res = await axios.post(`${config.API_URL}/auth/login`, { email, password });
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
        setError('Invalid user role received');
      }
    } catch (err) {
      console.error('Login error:', err);
      console.error('Response:', err.response);
      console.error('Request config:', err.config);
      
      if (err.response?.status === 401) {
        setError('Invalid email or password');
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (!navigator.onLine) {
        setError('No internet connection. Please check your network.');
      } else if (err.code === 'ECONNABORTED') {
        setError('Request timed out. Please try again.');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
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

          <Stack spacing={3} component="form" onSubmit={handleSubmit}>
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              required
              autoComplete="email"
              inputProps={{
                autoCapitalize: 'none'
              }}
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              required
              autoComplete="current-password"
            />
            <Button
              variant="contained"
              size="large"
              type="submit"
              startIcon={<LoginIcon />}
              disabled={isLoading}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>
            <Button
              variant="text"
              onClick={() => navigate('/register')}
              disabled={isLoading}
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