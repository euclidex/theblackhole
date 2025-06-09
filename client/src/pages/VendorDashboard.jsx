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
  const [requestsFilter, setRequestsFilter] = useState('open');
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
    console.log('Available categories:', uniqueCategories);
    return ['all', ...uniqueCategories];
  }, [requests]);

  // Filter requests based on search and filters
  const filteredRequests = useMemo(() => {
    console.log('Filtering requests. Total requests:', requests.length);
    console.log('Current filters:', { searchText, categoryFilter, proposalsFilter, requestsFilter });
    
    const filtered = requests.filter(request => {
      const matchesSearch = !searchText || 
        request.title?.toLowerCase().includes(searchText.toLowerCase()) ||
        request.category?.toLowerCase().includes(searchText.toLowerCase()) ||
        request.description?.toLowerCase().includes(searchText.toLowerCase());

      const matchesCategory = categoryFilter === 'all' || request.category === categoryFilter;
      
      const hasMyProposals = request.proposals?.some(p => p.vendorId === currentUserEmail);
      const matchesProposalsFilter = proposalsFilter === 'all' || 
        (proposalsFilter === 'withProposals' && hasMyProposals);

      // Calculate if request is expired
      const deadline = new Date(request.deadline);
      const isExpired = deadline < new Date();
      
      // Match requests filter
      let matchesRequestsFilter = true;
      if (requestsFilter === 'open') {
        matchesRequestsFilter = !isExpired && request.status?.toLowerCase() === 'open';
      } else if (requestsFilter === 'expired') {
        matchesRequestsFilter = isExpired;
      }
      // 'all' matches everything
      
      const shouldInclude = matchesSearch && matchesCategory && matchesProposalsFilter && matchesRequestsFilter;
      console.log('Request filtering:', {
        id: request.id,
        title: request.title,
        status: request.status,
        isExpired,
        matchesSearch,
        matchesCategory,
        matchesProposalsFilter,
        matchesRequestsFilter,
        shouldInclude
      });
      
      return shouldInclude;
    });

    console.log('Filtered requests:', filtered);
    return filtered;
  }, [requests, searchText, categoryFilter, proposalsFilter, requestsFilter, currentUserEmail]);

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
      console.log('Current user email:', decoded.email);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      console.log('Fetching requests from:', `${config.API_URL}/sourcing-requests`);
      const response = await axios.get(`${config.API_URL}/sourcing-requests`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      console.log('API Response:', response);
      console.log('Fetched requests:', response.data);
      console.log('Open requests:', response.data.filter(r => r.status?.toLowerCase() === 'open').length);
      setRequests(response.data);
    } catch (error) {
      console.error('Error fetching requests:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response,
        config: error.config
      });
      setSnackbarMessage('Error loading procurement requests. Please try again.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
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
      console.log('Fetching active proposals for vendor:', currentUserEmail);
      const response = await axios.get(`${config.API_URL}/sourcing-requests`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      console.log('Got sourcing requests:', response.data);
      
      const allProposals = response.data.reduce((acc, request) => {
        const myProposals = request.proposals
          ?.filter(p => p.vendorId === currentUserEmail)
          .map(p => ({
            ...p,
            id: p.id || `${request.id}_${Date.now()}`, // Ensure unique ID
            requestId: request.id,
            requestTitle: request.title,
            requestCategory: request.category,
            requestDeadline: request.deadline,
            requestStatus: request.status // Add request status
          }));
          
        if (myProposals?.length > 0) {
          console.log(`Found ${myProposals.length} proposals for request "${request.title}" (${request.status})`);
        }
        
        return [...acc, ...(myProposals || [])];
      }, []);

      // Sort proposals by submission date, newest first
      allProposals.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

      console.log('Total proposals found:', allProposals.length);
      setActiveProposals(allProposals);
    } catch (error) {
      console.error('Error fetching proposals:', error);
      console.error('Response:', error.response);
      setSnackbarMessage('Error loading proposals. Please try again.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  useEffect(() => {
    if (currentUserEmail) {
      console.log('Current user email changed, fetching proposals for:', currentUserEmail);
      fetchActiveProposals();
    }
  }, [currentUserEmail]);

  // Add filtered proposals logic
  const filteredActiveProposals = useMemo(() => {
    console.log('Filtering proposals:', {
      total: activeProposals.length,
      searchText: proposalsSearchText,
      categoryFilter: proposalsCategoryFilter,
      statusFilter: proposalsStatusFilter
    });

    const filtered = activeProposals.filter(proposal => {
      const matchesSearch = !proposalsSearchText || 
        proposal.requestTitle?.toLowerCase().includes(proposalsSearchText.toLowerCase()) ||
        proposal.requestCategory?.toLowerCase().includes(proposalsSearchText.toLowerCase()) ||
        proposal.notes?.toLowerCase().includes(proposalsSearchText.toLowerCase());
      
      const matchesCategory = proposalsCategoryFilter === 'all' || 
        proposal.requestCategory === proposalsCategoryFilter;
        
      const matchesStatus = proposalsStatusFilter === 'all' || 
        proposal.status?.toLowerCase() === proposalsStatusFilter?.toLowerCase();

      const shouldInclude = matchesSearch && matchesCategory && matchesStatus;
      
      if (!shouldInclude) {
        console.log('Filtering out proposal:', {
          id: proposal.id,
          requestTitle: proposal.requestTitle,
          matchesSearch,
          matchesCategory,
          matchesStatus
        });
      }

      return shouldInclude;
    });

    console.log('Filtered proposals:', filtered.length);
    return filtered;
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
          alignItems: 'center',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <Typography
            variant="body2"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              width: '100%'
            }}
          >
            {params.value}
          </Typography>
          <Typography
            variant="caption"
            color="textSecondary"
            sx={{
              width: '100%'
            }}
          >
            Request Status: {params.row.requestStatus}
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
        console.log('Submitting proposal:', {
          requestId: request.id,
          price: formData.price,
          deliveryDate: formData.deliveryDate,
          notes: formData.notes
        });

        const response = await axios.post(
          `${config.API_URL}/proposals`,
          {
            requestId: request.id,
            price: formData.price,
            deliveryDate: formData.deliveryDate,
            notes: formData.notes
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        
        console.log('Proposal submitted successfully:', response.data);
        handleClose();
        await fetchRequests();
        await fetchActiveProposals();
        
        setSnackbarMessage('Proposal submitted successfully!');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      } catch (error) {
        console.error('Error submitting proposal:', error.response?.data || error.message);
        setSnackbarMessage(error.response?.data?.message || 'Failed to submit proposal. Please try again.');
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

  // Custom "No rows" overlay component
  const CustomNoRowsOverlay = () => (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: '2rem',
        textAlign: 'center'
      }}
    >
      <Typography variant="h6" color="text.secondary" gutterBottom>
        No Open Procurement Requests
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {requests.length === 0 
          ? 'Loading procurement requests...' 
          : 'There are currently no open procurement requests. Please check back later for new opportunities.'}
      </Typography>
    </Box>
  );

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" sx={{
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
      }}>
        <Toolbar>
          <CycloneIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            The Black Hole
          </Typography>
          <Typography variant="body1" sx={{ mr: 2 }}>
            {currentUserEmail}
          </Typography>
          <Button 
            color="inherit" 
            onClick={handleLogout}
            startIcon={<LogoutIcon />}
          >
            LOGOUT
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Vendor Dashboard
        </Typography>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange}
            sx={{
              '& .MuiTab-root': {
                minWidth: 120,
                fontWeight: 'bold',
              }
            }}
          >
            <Tab label="PROCUREMENT REQUESTS" />
            <Tab label="SENT PROPOSALS" />
          </Tabs>
        </Box>

        {activeTab === 0 ? (
          <>
            <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                label="Search opportunities..."
                variant="outlined"
                size="small"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                sx={{ flexGrow: 1 }}
              />
              
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Requests</InputLabel>
                <Select
                  value={requestsFilter}
                  label="Requests"
                  onChange={(e) => setRequestsFilter(e.target.value)}
                >
                  <MenuItem value="all">All Requests</MenuItem>
                  <MenuItem value="open">Open Requests</MenuItem>
                  <MenuItem value="expired">Expired Requests</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Category</InputLabel>
                <Select
                  value={categoryFilter}
                  label="Category"
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <MenuItem value="all">All Categories</MenuItem>
                  {categories.filter(cat => cat !== 'all').map(category => (
                    <MenuItem key={category} value={category}>{category}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Proposals</InputLabel>
                <Select
                  value={proposalsFilter}
                  label="Proposals"
                  onChange={(e) => setProposalsFilter(e.target.value)}
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
              rowsPerPageOptions={[10]}
              disableSelectionOnClick
              autoHeight
              onRowClick={handleRowClick}
              components={{
                NoRowsOverlay: CustomNoRowsOverlay
              }}
              sx={{
                '& .MuiDataGrid-row:hover': {
                  cursor: 'pointer',
                  backgroundColor: 'rgba(0, 0, 0, 0.04)'
                }
              }}
            />
          </>
        ) : (
          <ActiveProposals />
        )}
      </Container>

      {requestDetailsOpen && selectedRequestDetails && (
        <RequestDetailsDialog
          open={requestDetailsOpen}
          onClose={() => setRequestDetailsOpen(false)}
          request={selectedRequestDetails}
        />
      )}

      {proposalDialogOpen && selectedRequest && (
        <ProposalDialog
          open={proposalDialogOpen}
          onClose={() => setProposalDialogOpen(false)}
          request={selectedRequest}
        />
      )}

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
    </Box>
  );
};

export default VendorDashboard;