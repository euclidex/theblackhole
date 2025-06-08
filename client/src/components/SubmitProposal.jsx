import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Alert
} from '@mui/material';
import axios from 'axios';

export default function SubmitProposal({ open, onClose, request, onSuccess }) {
  const [formData, setFormData] = useState({
    price: '',
    deliveryDate: '',
    notes: ''
  });
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log('Submitting proposal for request:', request);
      console.log('Form data:', formData);
      
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:5001/api/proposals', 
        {
          requestId: request.id,
          ...formData
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      // Clear form
      setFormData({
        price: '',
        deliveryDate: '',
        notes: ''
      });
      setError(null);
      
      // Notify parent component of success
      onSuccess(response.data);
      
      // Close the dialog
      onClose();
    } catch (error) {
      if (error.response?.status === 403 || error.message.includes('jwt expired')) {
        // Token expired, redirect to login with message
        localStorage.removeItem('token');
        localStorage.removeItem('userName');
        window.location.href = '/login?message=Your session has expired. Please log in again.';
        return;
      }
      console.error('Error submitting proposal:', error);
      setError(
        error.response?.data?.message || 
        'Failed to submit proposal. Please try again.'
      );
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Submit Proposal for {request?.title}</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Price (USD)"
              name="price"
              type="number"
              value={formData.price}
              onChange={handleChange}
              required
            />
            <TextField
              fullWidth
              label="Delivery Date"
              name="deliveryDate"
              type="date"
              value={formData.deliveryDate}
              onChange={handleChange}
              required
              InputLabelProps={{
                shrink: true,
              }}
            />
            <TextField
              fullWidth
              label="Additional Notes"
              name="notes"
              multiline
              rows={4}
              value={formData.notes}
              onChange={handleChange}
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" color="primary">
            Submit Proposal
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
} 