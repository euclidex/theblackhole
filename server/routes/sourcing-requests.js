const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const sourcingRequestsService = require('../services/sourcing-requests');

// Get all sourcing requests
router.get('/', authenticateToken, (req, res) => {
  try {
    console.log('GET /sourcing-requests');
    console.log('User:', req.user);
    
    // Get all requests
    const allRequests = sourcingRequestsService.getAllRequests();
    
    // Filter requests based on user role
    let filteredRequests;
    if (req.user.role === 'vendor') {
      console.log('Filtering requests for vendor');
      // Return requests that are either open or have proposals from this vendor
      filteredRequests = allRequests.filter(request => 
        request.status?.toLowerCase() === 'open' ||
        request.proposals?.some(p => p.vendorId === req.user.email)
      );
      console.log(`Found ${filteredRequests.length} relevant requests out of ${allRequests.length} total`);
    } else {
      console.log('Returning all requests for procurement officer');
      filteredRequests = allRequests;
    }

    // Add cache control headers
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    console.log('Returning requests:', filteredRequests);
    res.json(filteredRequests);
  } catch (error) {
    console.error('Error in GET /sourcing-requests:', error);
    res.status(500).json({ 
      message: error.message || 'Error fetching sourcing requests'
    });
  }
});

// Get a specific sourcing request
router.get('/:id', authenticateToken, (req, res) => {
  try {
    console.log(`GET /sourcing-requests/${req.params.id}`);
    const request = sourcingRequestsService.getRequestById(req.params.id);
    if (!request) {
      console.log('Request not found');
      return res.status(404).json({ message: 'Request not found' });
    }
    console.log('Returning request:', request);
    res.json(request);
  } catch (error) {
    console.error('Error in GET /sourcing-requests/:id:', error);
    res.status(500).json({ 
      message: error.message || 'Error fetching sourcing request'
    });
  }
});

// Create a new sourcing request
router.post('/', authenticateToken, (req, res) => {
  try {
    console.log('POST /sourcing-requests');
    console.log('Request body:', req.body);
    
    if (req.user.role !== 'procurement') {
      console.log('Unauthorized - only procurement officers can create requests');
      return res.status(403).json({ message: 'Only procurement officers can create requests' });
    }

    const { title, category, description, quantity, deadline, requirements } = req.body;
    
    const newRequest = {
      id: Date.now().toString(),
      title,
      category,
      description,
      quantity,
      deadline,
      requirements,
      status: 'open',
      createdBy: req.user.email,
      createdAt: new Date().toISOString(),
      proposals: []
    };

    const savedRequest = sourcingRequestsService.createRequest(newRequest);
    if (!savedRequest) {
      throw new Error('Failed to save request');
    }

    console.log('Created new request:', savedRequest);
    res.status(201).json(savedRequest);
  } catch (error) {
    console.error('Error in POST /sourcing-requests:', error);
    res.status(500).json({ 
      message: error.message || 'Error creating sourcing request'
    });
  }
});

// Update a sourcing request
router.put('/:id', authenticateToken, (req, res) => {
  try {
    console.log(`PUT /sourcing-requests/${req.params.id}`);
    console.log('Request body:', req.body);
    
    if (req.user.role !== 'procurement') {
      console.log('Unauthorized - only procurement officers can update requests');
      return res.status(403).json({ message: 'Only procurement officers can update requests' });
    }

    const updatedRequest = sourcingRequestsService.updateRequest(req.params.id, req.body);
    if (!updatedRequest) {
      throw new Error('Failed to update request');
    }

    console.log('Updated request:', updatedRequest);
    res.json(updatedRequest);
  } catch (error) {
    console.error('Error in PUT /sourcing-requests/:id:', error);
    res.status(500).json({ 
      message: error.message || 'Error updating sourcing request'
    });
  }
});

// Delete a sourcing request
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    console.log(`DELETE /sourcing-requests/${req.params.id}`);
    if (req.user.role !== 'procurement') {
      console.log('Unauthorized - only procurement officers can delete requests');
      return res.status(403).json({ message: 'Only procurement officers can delete requests' });
    }

    const deletedRequest = sourcingRequestsService.deleteRequest(req.params.id);
    if (!deletedRequest) {
      throw new Error('Failed to delete request');
    }

    console.log('Successfully deleted request:', deletedRequest);
    res.status(200).json({ message: 'Request deleted successfully', deletedRequest });
  } catch (error) {
    console.error('Error in DELETE /sourcing-requests/:id:', error);
    res.status(500).json({ 
      message: error.message || 'Error deleting sourcing request'
    });
  }
});

module.exports = router; 