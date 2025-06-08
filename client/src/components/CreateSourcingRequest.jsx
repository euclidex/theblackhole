import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  MenuItem,
  Box,
  Alert,
  List,
  ListItemButton,
  Paper,
  Typography,
  Chip
} from '@mui/material';
import axios from 'axios';
import jwtDecode from 'jwt-decode';

const categories = [
  'Medical Equipment',
  'Pharmaceuticals',
  'Supplies',
  'Services',
  'Maintenance',
];

export default function CreateSourcingRequest({ open, onClose, onSuccess, editData }) {
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    description: '',
    quantity: '',
    deadline: '',
    requirements: ''
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    if (editData) {
      // Format the date to YYYY-MM-DD for the date input
      const formattedDeadline = editData.deadline ? 
        editData.deadline.split('T')[0] : '';  // Just take the date part, no need for new Date()

      setFormData({
        title: editData.title || '',
        category: editData.category || '',
        description: editData.description || '',
        quantity: editData.quantity || '',
        deadline: formattedDeadline,
        requirements: editData.requirements || ''
      });
    } else {
      // Reset form when not editing
      setFormData({
        title: '',
        category: '',
        description: '',
        quantity: '',
        deadline: '',
        requirements: ''
      });
    }
  }, [editData]);

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const isExpired = new Date(formData.deadline) < new Date();
      const status = isExpired ? 'Closed' : (editData?.status || 'Open');

      const token = localStorage.getItem('token');
      const decoded = jwtDecode(token);
      
      const requestData = {
        ...formData,
        status: status,
        ...(editData && { id: editData.id }),
        ...(editData && { proposals: editData.proposals }),
        createdBy: editData ? editData.createdBy : decoded.email,
        createdAt: editData ? editData.createdAt : new Date().toISOString(),
        deadline: new Date(formData.deadline).toISOString()
      };

      let response;
      if (editData) {
        response = await axios.put(
          `http://localhost:5001/api/sourcing-requests/${editData.id}`,
          requestData,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
      } else {
        response = await axios.post(
          'http://localhost:5001/api/sourcing-requests',
          requestData,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
      }

      onSuccess(response.data);
      onClose();
      setFormData({
        title: '',
        category: '',
        description: '',
        quantity: '',
        deadline: '',
        requirements: ''
      });
      setError(null);
    } catch (error) {
      console.error('Error saving request:', error);
      setError(error.response?.data?.message || 'Failed to save request. Please try again.');
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ borderBottom: '2px solid #e0e0e0', pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            {editData ? (
              <Typography variant="h5">
                {editData.title}
              </Typography>
            ) : (
              <Typography variant="h5">
                New Sourcing Request
              </Typography>
            )}
            {editData && (
              <Chip 
                label={editData.status} 
                color={editData.status === 'Open' ? 'success' : 'default'}
                size="medium"
                sx={{
                  fontSize: '1rem',
                  px: 2,
                  py: 1,
                  fontWeight: 'bold',
                  '& .MuiChip-label': {
                    px: 2
                  }
                }}
              />
            )}
          </Box>
        </Box>
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 1 }}>
            <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Title
              </Typography>
              <TextField
                fullWidth
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                variant="outlined"
                size="small"
              />
            </Box>

            <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Category
              </Typography>
              <TextField
                select
                fullWidth
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                variant="outlined"
                size="small"
              >
                {categories.map(cat => (
                  <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                ))}
              </TextField>
            </Box>

            <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Quantity
              </Typography>
              <TextField
                fullWidth
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                required
                variant="outlined"
                size="small"
              />
            </Box>

            <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Description
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                variant="outlined"
              />
            </Box>

            <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Requirements
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                name="requirements"
                value={formData.requirements}
                onChange={handleChange}
                required
                variant="outlined"
              />
            </Box>

            <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Deadline
              </Typography>
              <TextField
                fullWidth
                type="date"
                name="deadline"
                value={formData.deadline}
                onChange={handleChange}
                required
                variant="outlined"
                size="small"
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid #e0e0e0' }}>
          <Button onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            color="primary"
          >
            {editData ? 'Save Changes' : 'Create Request'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
} 