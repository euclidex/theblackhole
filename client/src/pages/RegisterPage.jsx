import React, { useState } from 'react';
import axios from 'axios';
import {
  Box, Card, CardContent, TextField, Button, Typography, Alert,
  Stack, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
  });

  const [message, setMessage] = useState(null);

  const roles = [
    { label: 'Procurement Officer', value: 'procurement' },
    { label: 'Vendor', value: 'vendor' },
  ];

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log('Sending registration data:', formData);
      const res = await axios.post('http://localhost:5001/register', formData, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
        }
      });
      setMessage({ 
        type: 'success',
        text: 'Registered successfully! Redirecting to login...'
      });
      console.log('Registration response:', res.data);
      
      // Wait 2 seconds before redirecting
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      
    } catch (err) {
      console.error('Registration error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.message || 'Registration failed. Try again.' 
      });
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
            Register
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
              value={formData.email}
              onChange={(e) => handleChange({ target: { name: 'email', value: e.target.value } })}
              fullWidth
            />
            <TextField
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) => handleChange({ target: { name: 'password', value: e.target.value } })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={formData.role}
                label="Role"
                onChange={(e) => handleChange({ target: { name: 'role', value: e.target.value } })}
              >
                <MenuItem value="procurement">Procurement Officer</MenuItem>
                <MenuItem value="vendor">Vendor</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="contained"
              size="large"
              onClick={handleSubmit}
              startIcon={<PersonAddIcon />}
            >
              Register
            </Button>
            <Button
              variant="text"
              onClick={() => navigate('/login')}
            >
              Already have an account? Login
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default RegisterPage;