import React, { useState, useEffect, useMemo } from 'react';
import { 
  Container, Typography, Button, Box, Paper, TextField, FormControl, 
  InputLabel, Select, MenuItem, AppBar, Toolbar, Dialog, DialogTitle, DialogContent, DialogActions, Chip, Tabs, Tab, Card, CardContent, CardActions, Snackbar, Alert
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import SendIcon from '@mui/icons-material/Send';
import VisibilityIcon from '@mui/icons-material/Visibility';
import LogoutIcon from '@mui/icons-material/Logout';
import jwtDecode from 'jwt-decode';
import CycloneIcon from '@mui/icons-material/Cyclone';
import config from '../config';

const VendorDashboard = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [proposalsFilter, setProposalsFilter] = useState('all');
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [requestDetailsOpen, setRequestDetailsOpen] = useState(false);
  const [selectedRequestDetails, setSelectedRequestDetails] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [activeProposals, setActiveProposals] = useState([]);
  const [proposalsSearchText, setProposalsSearchText] = useState('');
  const [proposalsCategoryFilter, setProposalsCategoryFilter] = useState('all');
  const [proposalsStatusFilter, setProposalsStatusFilter] = useState('all');
  const [proposalDialogOpen, setProposalDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');

  // Get unique categories from requests
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(requests.map(req => req.category))];
    return ['all', ...uniqueCategories];
  }, [requests]);

  // Filter requests based on search and filters
  const filteredRequests = useMemo(() => {
    return requests.filter(request => {
      const matchesSearch = !searchText || 
        request.title?.toLowerCase().includes(searchText.toLowerCase()) ||
        request.category?.toLowerCase().includes(searchText.toLowerCase()) ||
        request.description?.toLowerCase().includes(searchText.toLowerCase());

      const matchesCategory = categoryFilter === 'all' || request.category === categoryFilter;
      
      const hasMyProposals = request.proposals?.some(p => p.vendorId === currentUserEmail);
      const matchesProposalsFilter = proposalsFilter === 'all' || 
        (proposalsFilter === 'withProposals' && hasMyProposals);

      // Only show Open requests
      return request.status === 'Open' && matchesSearch && matchesCategory && matchesProposalsFilter;
    });
  }, [requests, searchText, categoryFilter, proposalsFilter, currentUserEmail]);

  const columns = [
    {
      field: 'title',
      headerName: 'Title',
      flex: 2,
      renderCell: (params) => (
        <Box sx={{ 
          width: '100%', 
          height: '100%', 
          display: 'flex', 
          alignItems: 'center' 
        }}>
          <Typography
            variant="body2"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              '&:hover': { textDecoration: 'underline' }
            }}
          >
            {params.value}
          </Typography>
        </Box>
      )
    },
    { field: 'category', headerName: 'Category', flex: 1 },
    {
      field: 'daysLeft',
      headerName: 'Days Left',
      width: 120,
      renderCell: (params) => {
        const deadline = params.row.deadline;
        if (!deadline) return '';
        
        const days = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
        let color = 'inherit';
        if (days <= 0) color = 'error.main';
        else if (days <= 7) color = 'warning.main';
        
        return (
          <Box sx={{ 
            width: '100%', 
            height: '100%', 
            display: 'flex', 
            alignItems: 'center' 
          }}>
            <Typography color={color}>
              {days <= 0 ? 'Expired' : `${days} days`}
            </Typography>
          </Box>
        );
      }
    },
    {
      field: 'proposals',
      headerName: 'My Proposals',
      flex: 1,
      renderCell: (params) => {
        const myProposals = params.row.proposals?.filter(p => p.vendorId === currentUserEmail) || [];
        
        if (myProposals.length === 0) {
          return (
            <Box sx={{ 
              width: '100%', 
              height: '100%', 
              display: 'flex', 
              alignItems: 'center' 
            }}>
              <Typography 
                variant="body2" 
                sx={{ fontStyle: 'italic', color: 'text.secondary' }}
              >
                None sent
              </Typography>
            </Box>
          );
        }

        return (
          <Button
            variant="outlined"
            size="small"
            startIcon={<VisibilityIcon />}
            onClick={() => handleViewProposals(params.row)}
          >
            Show sent proposals
          </Button>
        );
      }
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 1,
      renderCell: (params) => (
        <Button
          variant="contained"
          color="primary"
          size="small"
          startIcon={<SendIcon />}
          onClick={() => handleSendProposal(params.row)}
        >
          Send new proposal
        </Button>
      )
    }
  ];

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const decoded = jwtDecode(token);
      setCurrentUserEmail(decoded.email);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await axios.get(`${config.API_URL}/api/sourcing-requests`);
      setRequests(response.data);
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
  };

  const handleViewDetails = (request) => {
    setSelectedRequestDetails(request);
    setRequestDetailsOpen(true);
  };

  const handleViewProposals = (request) => {
    // Switch to Sent Proposals tab
    setActiveTab(1);
    
    // Set the search text to the request title
    setProposalsSearchText(request.title);
  };

  const handleSendProposal = (request) => {
    setSelectedRequest(request);
    setProposalDialogOpen(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  const RequestDetailsDialog = ({ open, onClose, request }) => {
    if (!request) return null;

    const DetailField = ({ label, value }) => (
      <Box 
        sx={{ 
          mb: 2,
          p: 2,
          border: '1px solid #e0e0e0',
          borderRadius: 1
        }}
      >
        <Typography 
          variant="subtitle2" 
          color="text.secondary" 
          gutterBottom
        >
          {label}
        </Typography>
        <Typography 
          variant="body1" 
          sx={{ whiteSpace: 'pre-wrap' }}
        >
          {value || 'Not specified'}
        </Typography>
      </Box>
    );

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
              <Typography variant="h5">
                {request.title}
              </Typography>
              <Chip 
                label={request.status} 
                color={request.status === 'Open' ? 'success' : 'default'}
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
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Box sx={{ py: 1 }}>
            <DetailField 
              label="Category"
              value={request.category}
            />
            <DetailField 
              label="Deadline"
              value={new Date(request.deadline).toLocaleDateString()}
            />
            <DetailField 
              label="Description"
              value={request.description}
            />
            <DetailField 
              label="Requirements"
              value={request.requirements}
            />
            <DetailField 
              label="Quantity Required"
              value={request.quantity}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid #e0e0e0' }}>
          <Button 
            onClick={onClose}
            variant="outlined"
          >
            Close
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<SendIcon />}
            onClick={() => {
              onClose();
              handleSendProposal(request);
            }}
          >
            Send Proposal
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // Add this function to handle row clicks
  const handleRowClick = (params, event) => {
    // Don't open dialog if clicking on buttons (they have their own handlers)
    if (event.target.closest('button')) {
      return;
    }
    
    handleViewDetails(params.row);
  };

  const fetchActiveProposals = async () => {
    try {
      const response = await axios.get(`${config.API_URL}/api/sourcing-requests`);
      const allProposals = response.data.reduce((acc, request) => {
        const myProposals = request.proposals
          ?.filter(p => p.vendorId === currentUserEmail)
          .map(p => ({
            ...p,
            id: p.id,
            requestTitle: request.title,
            requestCategory: request.category
          }));
        return [...acc, ...(myProposals || [])];
      }, []);
      setActiveProposals(allProposals);
    } catch (error) {
      console.error('Error fetching proposals:', error);
    }
  };

  useEffect(() => {
    if (currentUserEmail) {
      fetchActiveProposals();
    }
  }, [currentUserEmail]);

  // Add filtered proposals logic
  const filteredActiveProposals = useMemo(() => {
    return activeProposals.filter(proposal => {
      const matchesSearch = !proposalsSearchText || 
        proposal.requestTitle?.toLowerCase().includes(proposalsSearchText.toLowerCase()) ||
        proposal.requestCategory?.toLowerCase().includes(proposalsSearchText.toLowerCase());
      
      const matchesCategory = proposalsCategoryFilter === 'all' || 
        proposal.requestCategory === proposalsCategoryFilter;
        
      const matchesStatus = proposalsStatusFilter === 'all' || 
        proposal.status === proposalsStatusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [activeProposals, proposalsSearchText, proposalsCategoryFilter, proposalsStatusFilter]);

  // Add proposal columns definition
  const proposalColumns = [
    {
      field: 'requestTitle',
      headerName: 'Request Title',
      flex: 2,
      renderCell: (params) => (
        <Box sx={{ 
          width: '100%', 
          height: '100%', 
          display: 'flex', 
          alignItems: 'center' 
        }}>
          <Typography
            variant="body2"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {params.value}
          </Typography>
        </Box>
      )
    },
    {
      field: 'requestCategory',
      headerName: 'Category',
      flex: 1
    },
    {
      field: 'price',
      headerName: 'Price',
      flex: 1,
      renderCell: (params) => (
        <Box sx={{ 
          width: '100%', 
          height: '100%', 
          display: 'flex', 
          alignItems: 'center' 
        }}>
          <Typography>${params.value}</Typography>
        </Box>
      )
    },
    {
      field: 'deliveryDate',
      headerName: 'Delivery Date',
      flex: 1,
      renderCell: (params) => (
        <Box sx={{ 
          width: '100%', 
          height: '100%', 
          display: 'flex', 
          alignItems: 'center' 
        }}>
          <Typography>
            {new Date(params.value).toLocaleDateString()}
          </Typography>
        </Box>
      )
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 1,
      renderCell: (params) => (
        <Box sx={{ 
          width: '100%', 
          height: '100%', 
          display: 'flex', 
          alignItems: 'center' 
        }}>
          <Typography>{params.value}</Typography>
        </Box>
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 1,
      renderCell: (params) => (
        <Button
          variant="outlined"
          size="small"
          startIcon={<VisibilityIcon />}
          onClick={() => navigate(`/requests/${params.row.requestId}/my-proposals`)}
        >
          View Details
        </Button>
      )
    }
  ];

  // Update the ActiveProposals component
  const ActiveProposals = () => {
    return (
      <Paper sx={{ width: '100%', mb: 2 }}>
        <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Search proposals..."
            value={proposalsSearchText}
            onChange={(e) => setProposalsSearchText(e.target.value)}
            sx={{ flex: 1 }}
          />

          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={proposalsCategoryFilter}
              onChange={(e) => setProposalsCategoryFilter(e.target.value)}
              label="Category"
            >
              <MenuItem value="all">All Categories</MenuItem>
              {categories.filter(cat => cat !== 'all').map(category => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={proposalsStatusFilter}
              onChange={(e) => setProposalsStatusFilter(e.target.value)}
              label="Status"
            >
              <MenuItem value="all">All Statuses</MenuItem>
              <MenuItem value="Pending">Pending</MenuItem>
              <MenuItem value="Shortlisted">Shortlisted</MenuItem>
              <MenuItem value="Rejected">Rejected</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <DataGrid
          rows={filteredActiveProposals}
          columns={proposalColumns}
          pageSize={10}
          rowsPerPageOptions={[10, 25, 50]}
          disableSelectionOnClick
          autoHeight
          sx={{
            '& .MuiDataGrid-cell': {
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }
          }}
        />
      </Paper>
    );
  };

  // Update the ProposalDialog component
  const ProposalDialog = ({ open, onClose, request }) => {
    const [formData, setFormData] = useState({
      price: '',
      deliveryDate: '',
      notes: ''
    });

    // Reset form when dialog opens or request changes
    useEffect(() => {
      if (open || request) {
        setFormData({
          price: '',
          deliveryDate: '',
          notes: ''
        });
      }
    }, [open, request]);

    // Add more detailed logging for form updates
    const handlePriceChange = (e) => {
      const value = e.target.value;
      console.log('Price change event:', {
        rawValue: e.target.value,
        type: typeof value,
        stringValue: value.toString()
      });
      setFormData(prev => ({
        ...prev,
        price: value
      }));
    };

    const handleDateChange = (e) => {
      const value = e.target.value;
      console.log('Date change event:', {
        rawValue: e.target.value,
        type: typeof value
      });
      setFormData(prev => ({
        ...prev,
        deliveryDate: value
      }));
    };

    // Log form state changes
    useEffect(() => {
      console.log('Form data updated:', {
        price: {
          value: formData.price,
          type: typeof formData.price,
          isEmpty: !formData.price,
        },
        deliveryDate: {
          value: formData.deliveryDate,
          type: typeof formData.deliveryDate,
          isEmpty: !formData.deliveryDate,
        }
      });
    }, [formData]);

    if (!request) return null;

    const handleClose = () => {
      setFormData({
        price: '',
        deliveryDate: '',
        notes: ''
      });
      onClose();
    };

    const handleSubmit = async () => {
      try {
        const response = await axios.post(
          `${config.API_URL}/api/proposals`,
          {
            ...formData,
            requestId: request.id,
            vendorId: currentUserEmail,
            status: 'Pending',
            vendorName: currentUserEmail.split('@')[0],
            submittedAt: new Date().toISOString(),
            createdAt: new Date().toISOString()
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        
        handleClose();
        await fetchRequests();
        await fetchActiveProposals();
        
        // Replace alert with Snackbar
        setSnackbarMessage('Proposal submitted successfully!');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      } catch (error) {
        console.error('Error submitting proposal:', error);
        setSnackbarMessage('Failed to submit proposal. Please try again.');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
    };

    return (
      <Dialog 
        open={open} 
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Submit Proposal for "{request.title}"
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="Price ($)"
            type="number"
            value={formData.price}
            onChange={handlePriceChange}
            sx={{ mb: 2 }}
            inputProps={{ min: 0 }}
          />
          <TextField
            fullWidth
            label="Delivery Date"
            type="date"
            defaultValue=""
            value={formData.deliveryDate}
            onChange={handleDateChange}
            InputLabelProps={{ shrink: true }}
            inputProps={{
              min: new Date().toISOString().split('T')[0]
            }}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Notes"
            multiline
            rows={4}
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleSubmit}
            disabled={!formData.price || !formData.deliveryDate}
          >
            Submit Proposal
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // Add this function to handle tab changes
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    // Clear filters and search when switching to Sent Proposals tab
    if (newValue === 1) {
      setProposalsSearchText('');
      setProposalsCategoryFilter('all');
      setProposalsStatusFilter('all');
    }
  };

  return (
    <>
      <AppBar position="static" 
        sx={{ 
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
          boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
          borderBottom: '3px solid #1976d2'  // Material-UI's default blue
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
          }}>
            <CycloneIcon sx={{ fontSize: 28, mr: 1 }} />
            <Typography variant="h6">
              The Black Hole
            </Typography>
          </Box>
          
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'flex-end',
            ml: 'auto'  // Push to the right
          }}>
            <Typography variant="body2" sx={{ mr: 2, color: 'inherit' }}>
              {currentUserEmail}
            </Typography>
            <Button color="inherit" onClick={handleLogout} startIcon={<LogoutIcon />}>
              Logout
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Box sx={{ mb: 3 }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange}
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>Open Procurement Requests</span>
                  <Chip 
                    label={filteredRequests.length} 
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(0, 0, 0, 0.08)',
                      color: 'text.secondary',
                      height: '20px'
                    }}
                  />
                </Box>
              } 
            />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>Sent Proposals</span>
                  <Chip 
                    label={activeProposals.length} 
                    size="small"
                    color="primary"
                    sx={{ height: '20px' }}
                  />
                </Box>
              } 
            />
          </Tabs>
        </Box>

        {activeTab === 0 ? (
          <Paper sx={{ width: '100%', mb: 2 }}>
            <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                size="small"
                placeholder="Search opportunities..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                sx={{ flex: 1 }}
              />

              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Category</InputLabel>
                <Select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  label="Category"
                >
                  <MenuItem value="all">All Categories</MenuItem>
                  {categories.filter(cat => cat !== 'all').map(category => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Proposals</InputLabel>
                <Select
                  value={proposalsFilter}
                  onChange={(e) => setProposalsFilter(e.target.value)}
                  label="Proposals"
                >
                  <MenuItem value="all">All Requests</MenuItem>
                  <MenuItem value="withProposals">With My Proposals</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <DataGrid
              rows={filteredRequests}
              columns={columns}
              pageSize={10}
              rowsPerPageOptions={[10, 25, 50]}
              disableSelectionOnClick
              autoHeight
              onRowClick={handleRowClick}
              sx={{
                '& .MuiDataGrid-cell': {
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  cursor: 'pointer'  // Add pointer cursor to show clickable rows
                }
              }}
            />
          </Paper>
        ) : (
          <ActiveProposals />
        )}

        <RequestDetailsDialog 
          open={requestDetailsOpen}
          onClose={() => setRequestDetailsOpen(false)}
          request={selectedRequestDetails}
        />
        <ProposalDialog 
          open={proposalDialogOpen}
          onClose={() => setProposalDialogOpen(false)}
          request={selectedRequest}
        />

        <Snackbar
          open={snackbarOpen}
          autoHideDuration={6000}
          onClose={() => setSnackbarOpen(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert 
            onClose={() => setSnackbarOpen(false)} 
            severity={snackbarSeverity}
            sx={{ width: '100%' }}
          >
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Container>
    </>
  );
};

export default VendorDashboard;