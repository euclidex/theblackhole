import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert,
  Breadcrumbs,
  Link,
  AppBar,
  Toolbar,
  IconButton
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LogoutIcon from '@mui/icons-material/Logout';
import CycloneIcon from '@mui/icons-material/Cyclone';
import axios from 'axios';
import config from '../config';
import jwtDecode from 'jwt-decode';

export default function VendorProposalDetailsPage() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [myProposals, setMyProposals] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [currentUserName, setCurrentUserName] = useState('');

  useEffect(() => {
    // Get user info from token
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setCurrentUserEmail(decoded.email);
        setCurrentUserName(decoded.email.split('@')[0]);
      } catch (error) {
        console.error('Error decoding token:', error);
        navigate('/login');
      }
    } else {
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUserEmail) return;

      try {
        setLoading(true);
        setError(null);

        // Get the request details
        const requestResponse = await axios.get(
          `${config.API_URL}/sourcing-requests/${requestId}`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );

        setRequest(requestResponse.data);

        // Filter proposals for the current vendor
        const vendorProposals = requestResponse.data.proposals?.filter(
          p => p.vendorId === currentUserEmail
        ) || [];

        console.log('Current user email:', currentUserEmail);
        console.log('All proposals:', requestResponse.data.proposals);
        console.log('Filtered proposals:', vendorProposals);

        setMyProposals(vendorProposals);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.response?.data?.message || 'Error loading proposal details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [requestId, currentUserEmail]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  if (loading) {
    return (
      <>
        <AppBar position="static" sx={{ bgcolor: 'white', boxShadow: 1 }}>
          <Toolbar>
            <CycloneIcon sx={{ color: 'black', mr: 2 }} />
            <Box sx={{ flexGrow: 1 }} />
            <Typography sx={{ color: 'black', mr: 2 }}>
              {currentUserName}
            </Typography>
            <IconButton onClick={handleLogout} sx={{ color: 'black' }}>
              <LogoutIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
        <Container maxWidth="lg" sx={{ mt: 4 }}>
          <Typography>Loading...</Typography>
        </Container>
      </>
    );
  }

  if (error) {
    return (
      <>
        <AppBar position="static" sx={{ bgcolor: 'white', boxShadow: 1 }}>
          <Toolbar>
            <CycloneIcon sx={{ color: 'black', mr: 2 }} />
            <Box sx={{ flexGrow: 1 }} />
            <Typography sx={{ color: 'black', mr: 2 }}>
              {currentUserName}
            </Typography>
            <IconButton onClick={handleLogout} sx={{ color: 'black' }}>
              <LogoutIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
        <Container maxWidth="lg" sx={{ mt: 4 }}>
          <Alert severity="error">{error}</Alert>
        </Container>
      </>
    );
  }

  return (
    <>
      <AppBar position="static" sx={{ bgcolor: 'white', boxShadow: 1 }}>
        <Toolbar>
          <CycloneIcon sx={{ color: 'black', mr: 2 }} />
          <Box sx={{ flexGrow: 1 }} />
          <Typography sx={{ color: 'black', mr: 2 }}>
            {currentUserName}
          </Typography>
          <IconButton onClick={handleLogout} sx={{ color: 'black' }}>
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4 }}>
        {/* Breadcrumb Navigation */}
        <Breadcrumbs sx={{ mb: 3 }}>
          <Link
            component="button"
            onClick={() => navigate('/vendor-dashboard')}
            underline="hover"
            color="inherit"
          >
            Vendor Dashboard
          </Link>
          <Typography color="text.primary">My Proposals</Typography>
        </Breadcrumbs>

        {/* Back Button */}
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/vendor-dashboard')}
          sx={{ mb: 3 }}
        >
          Back to Dashboard
        </Button>

        {/* Request Details */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
            <Box>
              <Typography variant="h4" gutterBottom>
                {request?.title}
              </Typography>
              <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                Category: {request?.category}
              </Typography>
            </Box>
            <Chip
              label={request?.status}
              color={request?.status?.toLowerCase() === 'open' ? 'success' : 'default'}
              sx={{ ml: 2 }}
            />
          </Box>

          <Typography variant="body1" paragraph>
            {request?.description}
          </Typography>

          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Requirements
            </Typography>
            <Typography variant="body1">
              {request?.requirements}
            </Typography>
          </Box>

          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Quantity Required
            </Typography>
            <Typography variant="body1">
              {request?.quantity}
            </Typography>
          </Box>

          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Deadline
            </Typography>
            <Typography variant="body1">
              {new Date(request?.deadline).toLocaleDateString()}
            </Typography>
          </Box>
        </Paper>

        {/* My Proposals */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            My Proposals
          </Typography>

          {myProposals.length === 0 ? (
            <Alert severity="info">
              You haven't submitted any proposals for this request yet.
            </Alert>
          ) : (
            <List>
              {myProposals.map((proposal, index) => (
                <React.Fragment key={proposal.id}>
                  <ListItem alignItems="flex-start" sx={{ flexDirection: 'column' }}>
                    <Box sx={{ width: '100%', mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="h6">
                          Proposal #{index + 1}
                        </Typography>
                        <Chip
                          label={proposal.status}
                          color={
                            proposal.status === 'Shortlisted' ? 'success' :
                            proposal.status === 'Rejected' ? 'error' :
                            'default'
                          }
                        />
                      </Box>
                      
                      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">
                            Price
                          </Typography>
                          <Typography variant="body1">
                            ${proposal.price}
                          </Typography>
                        </Box>
                        
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">
                            Delivery Date
                          </Typography>
                          <Typography variant="body1">
                            {new Date(proposal.deliveryDate).toLocaleDateString()}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ gridColumn: '1 / -1' }}>
                          <Typography variant="subtitle2" color="text.secondary">
                            Notes
                          </Typography>
                          <Typography variant="body1">
                            {proposal.notes}
                          </Typography>
                        </Box>
                      </Box>

                      {proposal.statusHistory && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="subtitle2" color="text.secondary">
                            Status History
                          </Typography>
                          <List dense>
                            {proposal.statusHistory.map((history, historyIndex) => (
                              <ListItem key={historyIndex} sx={{ px: 0 }}>
                                <ListItemText
                                  primary={history.status}
                                  secondary={`Updated by ${history.updatedBy} on ${new Date(history.updatedAt).toLocaleString()}`}
                                />
                              </ListItem>
                            ))}
                          </List>
                        </Box>
                      )}
                    </Box>
                  </ListItem>
                  {index < myProposals.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </Paper>
      </Container>
    </>
  );
} 