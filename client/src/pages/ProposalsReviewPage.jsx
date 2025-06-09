import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Chip,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  AppBar,
  Toolbar,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LogoutIcon from '@mui/icons-material/Logout';
import CycloneIcon from '@mui/icons-material/Cyclone';
import ConstructionIcon from '@mui/icons-material/Construction';
import axios from 'axios';
import { 
  DataGrid,
  GridToolbar,
} from '@mui/x-data-grid';
import { PROPOSAL_STATUSES } from '../constants';  // We should move this to a constants file
import config from '../config';

export default function ProposalsReviewPage() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [sortBy, setSortBy] = useState('createdAt');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentUserName, setCurrentUserName] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [developmentDialogOpen, setDevelopmentDialogOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedProposalDetails, setSelectedProposalDetails] = useState(null);
  const [confirmationDialog, setConfirmationDialog] = useState({
    open: false,
    action: null,
    proposal: null,
    title: '',
    message: ''
  });

  useEffect(() => {
    const fetchRequest = async () => {
      try {
        const response = await axios.get(`${config.API_URL}/sourcing-requests/${requestId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        setRequest(response.data);
      } catch (error) {
        console.error('Error fetching request:', error);
      }
    };
    fetchRequest();
  }, [requestId]);

  useEffect(() => {
    const userName = localStorage.getItem('userName');
    setCurrentUserName(userName || '');
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    window.location.href = '/';
  };

  const columns = [
    { 
      field: 'vendorName', 
      headerName: 'Vendor',
      flex: 1,
      minWidth: 150
    },
    { 
      field: 'price', 
      headerName: 'Price (USD)',
      width: 130,
      renderCell: (params) => `$${params.value}`
    },
    { 
      field: 'deliveryDate', 
      headerName: 'Delivery Date',
      width: 150,
      renderCell: (params) => new Date(params.value).toLocaleDateString()
    },
    { 
      field: 'status', 
      headerName: 'Status',
      width: 130,
      renderCell: (params) => (
        <Chip 
          label={params.value}
          color={
            params.value === PROPOSAL_STATUSES.SHORTLISTED ? 'success' :
            params.value === PROPOSAL_STATUSES.REJECTED ? 'error' :
            params.value === PROPOSAL_STATUSES.IGNORED ? 'default' :
            'primary'
          }
          size="small"
        />
      )
    },
    { 
      field: 'notes', 
      headerName: 'Notes',
      flex: 2,
      minWidth: 200
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 300,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Box sx={{ 
          display: 'flex', 
          gap: 1,
          width: '100%',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%'
        }}>
          {params.row.status === PROPOSAL_STATUSES.PENDING ? (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                color="success"
                size="small"
                onClick={() => handleProposalAction(params.row, PROPOSAL_STATUSES.SHORTLISTED)}
              >
                Shortlist
              </Button>
              <Button
                variant="contained"
                color="error"
                size="small"
                onClick={() => handleProposalAction(params.row, PROPOSAL_STATUSES.REJECTED)}
              >
                Reject
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => handleProposalAction(params.row, PROPOSAL_STATUSES.IGNORED)}
              >
                Ignore
              </Button>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No actions available
            </Typography>
          )}
        </Box>
      )
    }
  ];

  const getConfirmationDetails = (action) => {
    switch (action) {
      case PROPOSAL_STATUSES.SHORTLISTED:
        return {
          title: 'Confirm Shortlist',
          message: 'Are you sure you want to shortlist this proposal?'
        };
      case PROPOSAL_STATUSES.REJECTED:
        return {
          title: 'Confirm Rejection',
          message: 'Are you sure you want to reject this proposal?'
        };
      case PROPOSAL_STATUSES.IGNORED:
        return {
          title: 'Confirm Ignore',
          message: 'Are you sure you want to ignore this proposal?'
        };
      case PROPOSAL_STATUSES.PENDING:
        return {
          title: 'Remove from Shortlist',
          message: 'Are you sure you want to remove this proposal from the shortlist? It will return to pending status.'
        };
      default:
        return { title: '', message: '' };
    }
  };

  const handleProposalAction = (proposal, newStatus) => {
    const { title, message } = getConfirmationDetails(newStatus);
    setConfirmationDialog({
      open: true,
      action: newStatus,
      proposal,
      title,
      message
    });
  };

  const handleConfirmedAction = async () => {
    const { proposal, action } = confirmationDialog;
    try {
      const response = await axios.put(
        `${config.API_URL}/proposals/${proposal.id}/status`,
        { status: action },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      // Refresh the request data to get updated proposals
      const updatedRequest = await axios.get(
        `${config.API_URL}/sourcing-requests/${requestId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      setRequest(updatedRequest.data);
    } catch (error) {
      console.error('Error updating proposal:', error);
    } finally {
      setConfirmationDialog({ open: false, action: null, proposal: null, title: '', message: '' });
    }
  };

  const handleRowClick = (params, event) => {
    // Don't open dialog if clicking on a button or action cell
    if (
      event.target.closest('button') || // Ignore button clicks
      params.field === 'actions'        // Ignore clicks in actions column
    ) {
      return;
    }
    setSelectedProposalDetails(params.row);
  };

  const displayedProposals = useMemo(() => {
    if (!request?.proposals) return [];
    
    const filteredByTab = tabValue === 0 
      ? request.proposals 
      : request.proposals.filter(p => p.status === PROPOSAL_STATUSES.SHORTLISTED);

    return filteredByTab.filter(proposal => 
      !searchText || 
      proposal.vendorName.toLowerCase().includes(searchText.toLowerCase()) ||
      proposal.notes.toLowerCase().includes(searchText.toLowerCase()) ||
      proposal.price.toString().includes(searchText)
    );
  }, [request, tabValue, searchText]);

  const proposalCounts = useMemo(() => ({
    all: request?.proposals?.length || 0,
    shortlisted: request?.proposals?.filter(p => p.status === PROPOSAL_STATUSES.SHORTLISTED).length || 0
  }), [request]);

  const shortlistedColumns = [
    ...columns.slice(0, -1),
    {
      field: 'actions',
      headerName: 'Actions',
      width: 550,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center',
          gap: 3,
          width: '100%',
          height: '100%',
          alignItems: 'center',
          pl: 0,
          pr: 2
        }}>
          <Button
            variant="outlined"
            color="warning"
            size="small"
            onClick={() => handleProposalAction(params.row, PROPOSAL_STATUSES.PENDING)}
            sx={{ 
              whiteSpace: 'nowrap',
              minWidth: 'fit-content',
              px: 2
            }}
          >
            Remove from Shortlist
          </Button>
          <Button
            variant="contained"
            color="primary"
            size="small"
            onClick={() => setDevelopmentDialogOpen(true)}
            startIcon={<ConstructionIcon />}
            sx={{ 
              whiteSpace: 'nowrap',
              minWidth: 'fit-content',
              px: 2
            }}
          >
            Move to Procurement
          </Button>
        </Box>
      )
    }
  ];

  const ProposalDetailsDialog = ({ proposal, onClose }) => {
    if (!proposal) return null;

    const details = [
      { label: 'Vendor', value: proposal.vendorName },
      { label: 'Price', value: `$${proposal.price}` },
      { label: 'Delivery Date', value: new Date(proposal.deliveryDate).toLocaleDateString() },
      { label: 'Submitted At', value: new Date(proposal.submittedAt).toLocaleString() },
      { label: 'Notes', value: proposal.notes },
    ];

    return (
      <Dialog
        open={Boolean(proposal)}
        onClose={onClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Proposal Details
            </Typography>
            <Chip 
              label={proposal.status}
              color={
                proposal.status === PROPOSAL_STATUSES.SHORTLISTED ? 'success' :
                proposal.status === PROPOSAL_STATUSES.REJECTED ? 'error' :
                proposal.status === PROPOSAL_STATUSES.IGNORED ? 'default' :
                'primary'
              }
            />
          </Box>
        </DialogTitle>
        <DialogContent>
          <List>
            {details.map((detail, index) => (
              <ListItem 
                key={detail.label}
                divider={index < details.length - 1}
                sx={{ 
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 1,
                  py: 2
                }}
              >
                <Typography variant="subtitle2" color="text.secondary">
                  {detail.label}
                </Typography>
                <Typography variant="body1">
                  {detail.value}
                </Typography>
              </ListItem>
            ))}
            {proposal.statusHistory && (
              <ListItem 
                sx={{ 
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 1,
                  py: 2
                }}
              >
                <Typography variant="subtitle2" color="text.secondary">
                  Status History
                </Typography>
                <List sx={{ width: '100%' }}>
                  {proposal.statusHistory.map((history, index) => (
                    <ListItem 
                      key={index} 
                      divider={index < proposal.statusHistory.length - 1}
                      sx={{ px: 0 }}
                    >
                      <ListItemText
                        primary={history.status}
                        secondary={`Updated by ${history.updatedBy} on ${new Date(history.updatedAt).toLocaleString()}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </ListItem>
            )}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
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
          borderBottom: '3px solid #1976d2'
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
            ml: 'auto'
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
        <Box sx={{ mb: 4 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(-1)}
            sx={{ mb: 2 }}
          >
            Back to Dashboard
          </Button>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h4">
              Proposals for {request?.title}
            </Typography>
            <Chip 
              label={request?.status} 
              color={request?.status === 'Open' ? 'success' : 'default'}
            />
          </Box>
        </Box>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs 
            value={tabValue} 
            onChange={(e, newValue) => setTabValue(newValue)}
            sx={{
              '& .MuiTab-root': {
                minWidth: 120,
                fontWeight: 'bold',
              }
            }}
          >
            <Tab label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span>All Proposals</span>
                <Chip 
                  label={proposalCounts.all} 
                  size="small" 
                  sx={{ 
                    height: 20,
                    '& .MuiChip-label': { px: 1 }
                  }} 
                />
              </Box>
            } />
            <Tab label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span>Shortlisted</span>
                <Chip 
                  label={proposalCounts.shortlisted} 
                  size="small"
                  color="success"
                  sx={{ 
                    height: 20,
                    '& .MuiChip-label': { px: 1 }
                  }} 
                />
              </Box>
            } />
          </Tabs>
        </Box>

        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search proposals by vendor, notes, or price..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            sx={{
              backgroundColor: 'white',
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: 'rgba(0, 0, 0, 0.23)',
                },
                '&:hover fieldset': {
                  borderColor: 'rgba(0, 0, 0, 0.87)',
                },
              }
            }}
          />
        </Box>

        <Paper sx={{ width: '100%', mb: 3 }}>
          <DataGrid
            rows={displayedProposals}
            columns={tabValue === 0 ? columns : shortlistedColumns}
            pageSize={10}
            rowsPerPageOptions={[10, 25, 50]}
            disableSelectionOnClick
            autoHeight
            onRowClick={handleRowClick}
            components={{
              Toolbar: GridToolbar
            }}
            sx={{
              '& .MuiDataGrid-cell': {
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                cursor: 'pointer'
              }
            }}
          />
        </Paper>

        <Dialog
          open={developmentDialogOpen}
          onClose={() => setDevelopmentDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ConstructionIcon color="warning" />
            Feature Under Development
          </DialogTitle>
          <DialogContent>
            <Typography>
              The procurement functionality is currently under development. 
              This feature will be available in a future update.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDevelopmentDialogOpen(false)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={confirmationDialog.open}
          onClose={() => setConfirmationDialog({ open: false, action: null, proposal: null, title: '', message: '' })}
        >
          <DialogTitle>{confirmationDialog.title}</DialogTitle>
          <DialogContent>
            <Typography>{confirmationDialog.message}</Typography>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setConfirmationDialog({ open: false, action: null, proposal: null, title: '', message: '' })}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmedAction}
              variant="contained" 
              color={
                confirmationDialog.action === PROPOSAL_STATUSES.SHORTLISTED ? 'success' :
                confirmationDialog.action === PROPOSAL_STATUSES.REJECTED ? 'error' :
                'primary'
              }
            >
              Confirm
            </Button>
          </DialogActions>
        </Dialog>

        <ProposalDetailsDialog 
          proposal={selectedProposalDetails}
          onClose={() => setSelectedProposalDetails(null)}
        />
      </Container>
    </>
  );
} 