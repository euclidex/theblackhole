import React, { useState, useEffect, useMemo } from 'react';
import { 
  Container, Typography, Card, CardContent, Button, Grid, AppBar, Toolbar,
  Chip, Box, Divider, Snackbar, Alert, Dialog, DialogTitle, DialogContent,
  DialogActions, List, ListItem, ListItemText, Paper, TextField, FormControl, InputLabel, Select, MenuItem, SvgIcon,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import CreateSourcingRequest from '../components/CreateSourcingRequest';
import axios from 'axios';
import { 
  DataGrid, 
  GridToolbar,
  GridToolbarContainer,
  GridToolbarFilterButton,
  GridToolbarExport,
  GridToolbarQuickFilter,
  GridActionsCellItem,
} from '@mui/x-data-grid';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import jwtDecode from 'jwt-decode';
import CycloneIcon from '@mui/icons-material/Cyclone';
import config from '../config';

const PROPOSAL_STATUSES = {
  PENDING: 'Pending',
  SHORTLISTED: 'Shortlisted',
  REJECTED: 'Rejected',
  IGNORED: 'Ignored'
};

const OfficerDashboard = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [sourcingRequests, setSourcingRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isProposalsDialogOpen, setIsProposalsDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState(null);
  const [columnVisibilityModel, setColumnVisibilityModel] = useState(() => {
    // Load saved column preferences from localStorage
    const saved = localStorage.getItem('gridColumnVisibility');
    return saved ? JSON.parse(saved) : {
      title: true,
      category: true,
      status: true,
      proposals: true,
      daysLeft: true,
      createdBy: true,
      actions: true,
    };
  });
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [currentUserName, setCurrentUserName] = useState('');
  const [requestToEdit, setRequestToEdit] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [requestDetailsOpen, setRequestDetailsOpen] = useState(false);
  const [selectedRequestDetails, setSelectedRequestDetails] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [proposalsFilter, setProposalsFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewedProposals, setViewedProposals] = useState(() => {
    const saved = localStorage.getItem('viewedProposals');
    return new Set(saved ? JSON.parse(saved) : []);
  });

  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(sourcingRequests.map(req => req.category))];
    return ['all', ...uniqueCategories];
  }, [sourcingRequests]);

  const filteredRequests = useMemo(() => {
    return sourcingRequests.filter(request => {
      const matchesSearch = !searchText || 
        request.title?.toLowerCase().includes(searchText.toLowerCase()) ||
        request.category?.toLowerCase().includes(searchText.toLowerCase()) ||
        request.description?.toLowerCase().includes(searchText.toLowerCase()) ||
        request.status?.toLowerCase().includes(searchText.toLowerCase());

      const matchesCategory = categoryFilter === 'all' || request.category === categoryFilter;
      
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'open' && request.status === 'Open') ||
        (statusFilter === 'closed' && request.status === 'Closed');
      
      const matchesProposalsFilter = proposalsFilter === 'all' || 
        (proposalsFilter === 'new' && request.proposals?.some(p => p.status === PROPOSAL_STATUSES.PENDING));

      return matchesSearch && matchesCategory && matchesStatus && matchesProposalsFilter;
    });
  }, [sourcingRequests, searchText, categoryFilter, statusFilter, proposalsFilter]);

  const fetchSourcingRequests = async () => {
    try {
      console.log('Fetching sourcing requests from:', `${config.API_URL}/sourcing-requests`);
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('No token found');
        setSnackbar({
          open: true,
          message: 'Authentication error. Please log in again.',
          severity: 'error'
        });
        return;
      }

      const response = await axios.get(`${config.API_URL}/sourcing-requests`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      console.log('Response:', response);
      
      const requests = await Promise.all((response.data || []).map(async request => {
        const isExpired = request.deadline && new Date(request.deadline) < new Date();
        
        // Calculate days left
        let daysLeft = null;
        if (request.deadline) {
          const diffTime = new Date(request.deadline) - new Date();
          daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
        
        // If expired but status is still Open, update it on the server
        if (isExpired && request.status === 'Open') {
          try {
            console.log(`Updating expired request ${request.id} status to Closed`);
            const updateResponse = await axios.put(
              `${config.API_URL}/sourcing-requests/${request.id}/status`,
              { status: 'Closed' },
              {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Cache-Control': 'no-cache',
                  'Pragma': 'no-cache'
                }
              }
            );
            console.log('Update response:', updateResponse);
          } catch (error) {
            console.error('Error updating request status:', error);
            console.error('Response:', error.response);
          }
        }
        
        return {
          ...request,
          id: request.id || Date.now().toString(),
          proposals: Array.isArray(request.proposals) ? request.proposals : [],
          createdAt: request.createdAt || new Date().toISOString(),
          status: isExpired ? 'Closed' : (request.status || 'Open'),
          deadline: request.deadline || null,
          daysLeft: daysLeft
        };
      }));
      
      console.log('Processed requests:', requests);
      setSourcingRequests(requests);
    } catch (error) {
      console.error('Error fetching requests:', error);
      console.error('Response:', error.response);
      console.error('Request config:', error.config);
      
      let errorMessage = 'Failed to fetch sourcing requests';
      if (error.response?.status === 401) {
        errorMessage = 'Session expired. Please log in again.';
        // Redirect to login
        localStorage.removeItem('token');
        window.location.href = '/';
      } else if (!navigator.onLine) {
        errorMessage = 'No internet connection. Please check your network.';
      }
      
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error'
      });
    }
  };

  useEffect(() => {
    fetchSourcingRequests();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const decoded = jwtDecode(token);
      setCurrentUserEmail(decoded.email);
      // Get user name from local storage since it's not in the token
      const userName = localStorage.getItem('userName');
      setCurrentUserName(userName || decoded.email); // Fallback to email if name not found
    }
  }, []);

  const handleCreateSuccess = (newRequest) => {
    setSourcingRequests(prev => [...prev, newRequest]);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  const handleViewProposals = (request) => {
    // Mark all proposals in this request as viewed
    const newViewedProposals = new Set(viewedProposals);
    request.proposals.forEach(proposal => {
      newViewedProposals.add(proposal.id);
    });
    setViewedProposals(newViewedProposals);
    
    // Save to localStorage
    localStorage.setItem('viewedProposals', JSON.stringify([...newViewedProposals]));
    
    // Navigate to proposals page
    navigate(`/requests/${request.id}/proposals`);
  };

  const handleProposalAction = async (proposal, action) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${config.API_URL}/proposals/${proposal.id}/status`,
        { status: action },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        }
      );

      // Update local state for both sourcingRequests and selectedRequest
      const updatedRequests = sourcingRequests.map(req => {
        if (req.id === selectedRequest.id) {
          const updatedRequest = {
            ...req,
            proposals: req.proposals.map(p => 
              p.id === proposal.id ? { ...p, status: action } : p
            )
          };
          setSelectedRequest(updatedRequest);
          return updatedRequest;
        }
        return req;
      });
      setSourcingRequests(updatedRequests);

      setSnackbar({
        open: true,
        message: `Proposal ${action.toLowerCase()} successfully`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error updating proposal:', error);
      console.error('Response:', error.response);
      setSnackbar({
        open: true,
        message: 'Failed to update proposal status',
        severity: 'error'
      });
    }
  };

  const handleDeleteClick = (request) => {
    setRequestToDelete(request);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(
        `${config.API_URL}/sourcing-requests/${requestToDelete.id}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        }
      );

      // Update local state for sourcingRequests
      const updatedRequests = sourcingRequests.filter(req => req.id !== requestToDelete.id);
      setSourcingRequests(updatedRequests);

      // Show notification
      setSnackbar({
        open: true,
        message: 'Sourcing request deleted successfully',
        severity: 'success'
      });

      // Close dialog
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting sourcing request:', error);
      setSnackbar({
        open: true,
        message: 'Failed to delete sourcing request',
        severity: 'error'
      });
    }
  };

  // Save column visibility changes to localStorage
  const handleColumnVisibilityChange = (newModel) => {
    setColumnVisibilityModel(newModel);
    localStorage.setItem('gridColumnVisibility', JSON.stringify(newModel));
  };

  // Column definitions with enhanced features
  const columns = useMemo(() => [
    { 
      field: 'title', 
      headerName: 'Title', 
      flex: 2,
      minWidth: 200,
      description: 'The title of the sourcing request'
    },
    { 
      field: 'category', 
      headerName: 'Category',
      flex: 1,
      minWidth: 120,
      description: 'Category of goods or services'
    },
    { 
      field: 'status', 
      headerName: 'Status',
      width: 100,
      description: 'Current status of the request',
      renderCell: (params) => (
        <Chip 
          label={params.value} 
          color={
            params.value === 'Open' ? 'success' :
            params.value === 'Expired' ? 'error' :
            'default'
          }
          size="small"
        />
      )
    },
    {
      field: 'daysLeft',
      headerName: 'Days Left',
      width: 120,
      description: 'Days remaining until deadline',
      sortComparator: (v1, v2) => {
        if (v1 === null && v2 === null) return 0;
        if (v1 === null) return 1;
        if (v2 === null) return -1;
        return v1 - v2;
      },
      renderCell: (params) => {
        const deadline = params.row?.deadline;
        if (!deadline) {
          return (
            <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography color="text.secondary">No deadline</Typography>
            </Box>
          );
        }

        const diffTime = new Date(deadline) - new Date();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let text = diffDays < 0 ? 'Expired' :
                  diffDays === 0 ? 'Due today' :
                  `${diffDays} days`;
                  
        let className = diffDays < 0 ? 'expired' :
                        diffDays <= 7 ? 'urgent' :
                        diffDays <= 14 ? 'warning' : '';
                        
        return (
          <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography className={className}>
              {text}
            </Typography>
          </Box>
        );
      }
    },
    {
      field: 'createdBy',
      headerName: 'Created By',
      flex: 1,
      minWidth: 150,
      description: 'Request creator'
    },
    {
      field: 'proposals',
      headerName: 'Proposals',
      width: 200,
      description: 'Number of received proposals',
      renderCell: (params) => {
        const proposals = params.row.proposals || [];
        const totalCount = proposals.length;
        const newCount = proposals.filter(p => 
          p.status === PROPOSAL_STATUSES.PENDING && 
          !viewedProposals.has(p.id)
        ).length;
        
        if (totalCount === 0) {
          return (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              height: '100%'
            }}>
              <Typography 
                color="text.secondary" 
                variant="body2"
                sx={{ 
                  fontStyle: 'italic',
                  ml: 1 
                }}
              >
                None yet
              </Typography>
            </Box>
          );
        }

        return (
          <Button
            variant={newCount > 0 ? "contained" : "outlined"}
            color="primary"
            size="small"
            onClick={() => handleViewProposals(params.row)}
            sx={{
              minWidth: '160px',
              justifyContent: 'center',
              position: 'relative',
              '&:hover': {
                backgroundColor: newCount > 0 ? 'primary.dark' : 'action.hover'
              }
            }}
          >
            {totalCount} PROPOSALS
            {newCount > 0 && (
              <>
                {' '}
                <Chip
                  label={`${newCount} NEW`}
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.85)',
                    color: 'primary.main',
                    fontWeight: 'bold',
                    ml: 0.5,
                    height: 20,
                    '& .MuiChip-label': {
                      px: 1,
                      fontSize: '0.75rem'
                    }
                  }}
                />
              </>
            )}
          </Button>
        );
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      description: 'Available actions',
      renderCell: (params) => {
        const isCreator = params.row.createdBy === currentUserEmail;
        
        return (
          <Box sx={{ 
            display: 'flex', 
            gap: 1,
            alignItems: 'center',  // Center vertically
            height: '100%'  // Take full height of cell
          }}>
            {/* View action - show for non-creators */}
            {!isCreator && (
              <GridActionsCellItem
                icon={<VisibilityIcon />}
                label="View Details"
                onClick={() => {
                  setSelectedRequestDetails(params.row);
                  setRequestDetailsOpen(true);
                }}
                showInMenu={false}
                sx={{ ml: 1 }}  // Add some margin from the left
                title="View request details"  // Tooltip text
              />
            )}
            
            {/* Edit action - show only for creator */}
            {isCreator && (
              <GridActionsCellItem
                icon={<EditIcon />}
                label="Edit"
                onClick={() => {
                  setRequestToEdit(params.row);
                  setIsCreateDialogOpen(true);
                }}
                showInMenu={false}
                title="Edit request"  // Tooltip text
              />
            )}
            
            {/* Delete action - show only for creator */}
            {isCreator && (
              <GridActionsCellItem
                icon={<DeleteIcon />}
                label="Delete"
                onClick={() => {
                  setRequestToDelete(params.row);
                  setDeleteDialogOpen(true);
                }}
                showInMenu={false}
                sx={{ color: 'error.main' }}
                title="Delete request and its proposals"  // Tooltip text
              />
            )}
          </Box>
        );
      }
    },
  ], [currentUserEmail, navigate]);

  const ProposalsDialog = () => {
    const [sortBy, setSortBy] = useState('createdAt');
    const [filterStatus, setFilterStatus] = useState('all');

    const sortedAndFilteredProposals = useMemo(() => {
      let proposals = [...(selectedRequest?.proposals || [])];
      
      // Filter
      if (filterStatus !== 'all') {
        proposals = proposals.filter(p => p.status === filterStatus);
      }
      
      // Sort
      proposals.sort((a, b) => {
        switch (sortBy) {
          case 'price':
            return a.price - b.price;
          case 'deliveryDate':
            return new Date(a.deliveryDate) - new Date(b.deliveryDate);
          default:
            return new Date(b.createdAt) - new Date(a.createdAt);
        }
      });
      
      return proposals;
    }, [selectedRequest?.proposals, sortBy, filterStatus]);

    return (
      <Dialog 
        open={isProposalsDialogOpen} 
        onClose={() => setIsProposalsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Proposals for {selectedRequest?.title}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <FormControl size="small">
                <InputLabel>Filter</InputLabel>
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  label="Filter"
                >
                  <MenuItem value="all">All</MenuItem>
                  {Object.values(PROPOSAL_STATUSES).map(status => (
                    <MenuItem key={status} value={status}>{status}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small">
                <InputLabel>Sort by</InputLabel>
                <Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  label="Sort by"
                >
                  <MenuItem value="createdAt">Newest first</MenuItem>
                  <MenuItem value="price">Price</MenuItem>
                  <MenuItem value="deliveryDate">Delivery date</MenuItem>
                </Select>
              </FormControl>
              <Typography variant="subtitle2" color="text.secondary">
                {sortedAndFilteredProposals.length} proposals
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          {sortedAndFilteredProposals.length === 0 ? (
            <Typography color="textSecondary">
              No proposals found
            </Typography>
          ) : (
            <List>
              {sortedAndFilteredProposals.map((proposal) => (
                <ListItem 
                  key={proposal.id}
                  sx={{
                    mb: 2,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    p: 2
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle1">
                      From: {proposal.vendorName}
                    </Typography>
                    <Chip 
                      label={proposal.status} 
                      color={
                        proposal.status === PROPOSAL_STATUSES.SHORTLISTED ? 'success' :
                        proposal.status === PROPOSAL_STATUSES.REJECTED ? 'error' :
                        proposal.status === PROPOSAL_STATUSES.IGNORED ? 'default' :
                        'primary'
                      }
                      size="small"
                    />
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <ListItemText
                    primary={
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography><strong>Price:</strong> ${proposal.price}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography><strong>Delivery:</strong> {new Date(proposal.deliveryDate).toLocaleDateString()}</Typography>
                        </Grid>
                      </Grid>
                    }
                    secondary={
                      <Typography sx={{ mt: 1 }}><strong>Notes:</strong> {proposal.notes}</Typography>
                    }
                  />
                  {proposal.status === PROPOSAL_STATUSES.PENDING && (
                    <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                      <Button
                        variant="contained"
                        color="success"
                        onClick={() => handleProposalAction(proposal, PROPOSAL_STATUSES.SHORTLISTED)}
                      >
                        Shortlist
                      </Button>
                      <Button
                        variant="contained"
                        color="error"
                        onClick={() => handleProposalAction(proposal, PROPOSAL_STATUSES.REJECTED)}
                      >
                        Reject
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => handleProposalAction(proposal, PROPOSAL_STATUSES.IGNORED)}
                      >
                        Ignore
                      </Button>
                    </Box>
                  )}
                  {proposal.statusHistory && (
                    <Box sx={{ mt: 2, pt: 1, borderTop: 1, borderColor: 'divider' }}>
                      <Typography variant="caption" color="text.secondary">
                        Status History:
                      </Typography>
                      {proposal.statusHistory.map((history, index) => (
                        <Typography key={index} variant="caption" display="block" color="text.secondary">
                          {new Date(history.updatedAt).toLocaleString()} - {history.status} by {history.updatedBy}
                        </Typography>
                      ))}
                    </Box>
                  )}
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsProposalsDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  const handleEdit = (request) => {
    setRequestToEdit(request);
    setIsCreateDialogOpen(true);
  };

  const handleViewRequestDetails = (request) => {
    setSelectedRequestDetails(request);
    setRequestDetailsOpen(true);
  };

  const RequestDetailsDialog = ({ open, onClose, request }) => {
    if (!request) return null;

    const DetailField = ({ label, value }) => (
      <Box 
        sx={{ 
          mb: 2,
          p: 2,
          border: '1px solid #e0e0e0',  // Light grey border
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
              label="Created By"
              value={request.createdBy}
            />
            <DetailField 
              label="Created At"
              value={new Date(request.createdAt).toLocaleString()}
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
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid #e0e0e0' }}>
          <Button 
            onClick={onClose}
            variant="contained"
            color="primary"
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    );
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
              {currentUserName}
            </Typography>
            <Button color="inherit" onClick={handleLogout} startIcon={<LogoutIcon />}>
              Logout
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" gutterBottom>
            Procurement Dashboard
          </Typography>
        </Box>

        <Paper sx={{ width: '100%' }}>
          <Box sx={{ 
            p: 2, 
            borderBottom: 1, 
            borderColor: 'divider',
            display: 'flex',
            gap: 2,
            alignItems: 'center'
          }}>
            {/* Search field on the left */}
            <TextField
              size="small"
              placeholder="Search requests..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              sx={{ flex: 1 }}  // Fill available space
            />

            {/* Filters and button on the right */}
            <Box sx={{ 
              display: 'flex', 
              gap: 2, 
              alignItems: 'center',
            }}>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="all">All Requests</MenuItem>
                  <MenuItem value="open">Open</MenuItem>
                  <MenuItem value="closed">Closed</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Category</InputLabel>
                <Select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  label="Category"
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        maxHeight: 300,
                        '& .MuiMenuItem-root': {
                          my: 0.5,  // Margin top/bottom
                          mx: 1,    // Margin left/right
                          px: 2,    // Padding left/right
                          py: 1,    // Padding top/bottom
                          borderRadius: 1,
                          border: '1px solid #e0e0e0',
                          '&:hover': {
                            backgroundColor: '#e3f2fd',
                            borderColor: '#1976d2',
                          },
                          '&.Mui-selected': {
                            backgroundColor: '#bbdefb',
                            borderColor: '#1976d2',
                            '&:hover': {
                              backgroundColor: '#90caf9',
                            }
                          }
                        }
                      }
                    }
                  }}
                >
                  <MenuItem value="all">All Categories</MenuItem>
                  {categories.filter(cat => cat !== 'all').map(category => (
                    <MenuItem 
                      key={category} 
                      value={category}
                      sx={{ 
                        whiteSpace: 'normal',
                        wordBreak: 'break-word'
                      }}
                    >
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
                  <MenuItem value="new">With Proposals</MenuItem>
                </Select>
              </FormControl>

              <Button
                variant="contained"
                onClick={() => setIsCreateDialogOpen(true)}
                startIcon={<AddIcon />}
                sx={{ 
                  whiteSpace: 'nowrap',
                  minWidth: 'fit-content'
                }}
              >
                New Sourcing Request
              </Button>
            </Box>
          </Box>
          <DataGrid
            rows={filteredRequests}
            columns={columns}
            pageSize={10}
            rowsPerPageOptions={[10, 25, 50]}
            disableSelectionOnClick
            columnVisibilityModel={columnVisibilityModel}
            onColumnVisibilityModelChange={handleColumnVisibilityChange}
            components={{
              Toolbar: GridToolbar
            }}
            initialState={{
              sorting: {
                sortModel: [{ field: 'createdAt', sort: 'desc' }],
              },
            }}
            sx={{
              '& .MuiDataGrid-main': {
                backgroundColor: 'white',
              },
              '& .MuiDataGrid-cell': {
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              },
              '& .expired': {
                backgroundColor: '#ffebee',
                color: '#d32f2f',
              },
              '& .urgent': {
                backgroundColor: '#fff3e0',
                color: '#e65100',
              },
              '& .warning': {
                backgroundColor: '#fff8e1',
                color: '#ffa000',
              },
            }}
            autoHeight
          />
        </Paper>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
        >
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete this sourcing request?
              This will also delete all associated proposals.
              This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleDeleteConfirm} 
              color="error" 
              variant="contained"
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Create/Edit Request Dialog */}
        <CreateSourcingRequest
          open={isCreateDialogOpen}
          onClose={() => {
            setIsCreateDialogOpen(false);
            setRequestToEdit(null);
          }}
          onSuccess={(updatedRequest) => {
            if (requestToEdit) {
              setSourcingRequests(prev => 
                prev.map(req => req.id === updatedRequest.id ? updatedRequest : req)
              );
            } else {
              setSourcingRequests(prev => [...prev, updatedRequest]);
            }
            setRequestToEdit(null);
          }}
          editData={requestToEdit}
        />

        <ProposalsDialog />

        <RequestDetailsDialog 
          open={requestDetailsOpen}
          onClose={() => setRequestDetailsOpen(false)}
          request={selectedRequestDetails}
        />

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert 
            onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </>
  );
};

export default OfficerDashboard;