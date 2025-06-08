const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../middleware/auth');

const SOURCING_REQUESTS_FILE = path.join(__dirname, '..', 'sourcing_requests.json');

// Read sourcing requests from JSON file
let sourcingRequests = [];
try {
  const data = fs.readFileSync(SOURCING_REQUESTS_FILE, 'utf-8');
  sourcingRequests = JSON.parse(data);
  console.log(`Loaded ${sourcingRequests.length} sourcing requests from file`);
} catch (err) {
  console.error('Could not load sourcing_requests.json:', err);
  sourcingRequests = [];
}

// Helper to save sourcing requests
const saveSourcingRequests = () => {
  try {
    fs.writeFileSync(SOURCING_REQUESTS_FILE, JSON.stringify(sourcingRequests, null, 2));
    console.log(`Saved ${sourcingRequests.length} sourcing requests to file`);
  } catch (err) {
    console.error('Error saving sourcing requests:', err);
  }
};

// Get all sourcing requests
router.get('/', authenticateToken, (req, res) => {
  try {
    console.log('GET /sourcing-requests');
    console.log('User:', req.user);
    
    // Filter requests based on user role
    let filteredRequests;
    if (req.user.role === 'vendor') {
      console.log('Filtering requests for vendor');
      // Return requests that are either open or have proposals from this vendor
      filteredRequests = sourcingRequests.filter(request => 
        request.status?.toLowerCase() === 'open' ||
        request.proposals?.some(p => p.vendorId === req.user.email)
      );
      console.log(`Found ${filteredRequests.length} relevant requests out of ${sourcingRequests.length} total`);
      console.log('Status values found:', sourcingRequests.map(r => r.status));
    } else {
      console.log('Returning all requests for procurement officer');
      filteredRequests = sourcingRequests;
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
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: 'Error fetching sourcing requests', error: error.message });
  }
});

// Get a specific sourcing request
router.get('/:id', authenticateToken, (req, res) => {
  try {
    console.log(`GET /sourcing-requests/${req.params.id}`);
    const request = sourcingRequests.find(r => r.id === req.params.id);
    if (!request) {
      console.log('Request not found');
      return res.status(404).json({ message: 'Request not found' });
    }
    console.log('Returning request:', request);
    res.json(request);
  } catch (error) {
    console.error('Error in GET /sourcing-requests/:id:', error);
    res.status(500).json({ message: 'Error fetching sourcing request', error: error.message });
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

    sourcingRequests.push(newRequest);
    saveSourcingRequests();
    console.log('Created new request:', newRequest);
    res.status(201).json(newRequest);
  } catch (error) {
    console.error('Error in POST /sourcing-requests:', error);
    res.status(500).json({ message: 'Error creating sourcing request', error: error.message });
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

    const { id } = req.params;
    const index = sourcingRequests.findIndex(r => r.id === id);
    
    if (index === -1) {
      console.log('Request not found');
      return res.status(404).json({ message: 'Request not found' });
    }

    sourcingRequests[index] = { ...sourcingRequests[index], ...req.body };
    saveSourcingRequests();
    console.log('Updated request:', sourcingRequests[index]);
    res.json(sourcingRequests[index]);
  } catch (error) {
    console.error('Error in PUT /sourcing-requests/:id:', error);
    res.status(500).json({ message: 'Error updating sourcing request', error: error.message });
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

    const { id } = req.params;
    const index = sourcingRequests.findIndex(r => r.id === id);
    
    if (index === -1) {
      console.log('Request not found');
      return res.status(404).json({ message: 'Request not found' });
    }

    // Store the request before deleting it
    const deletedRequest = sourcingRequests[index];
    console.log('Deleting request:', deletedRequest);

    // Remove the request from the array
    sourcingRequests.splice(index, 1);
    
    // Save the updated array
    try {
      saveSourcingRequests();
      console.log('Successfully deleted request and saved changes');
      res.status(200).json({ message: 'Request deleted successfully', deletedRequest });
    } catch (saveError) {
      // If saving fails, add the request back to the array
      sourcingRequests.splice(index, 0, deletedRequest);
      throw saveError;
    }
  } catch (error) {
    console.error('Error in DELETE /sourcing-requests/:id:', error);
    res.status(500).json({ 
      message: 'Error deleting sourcing request',
      error: error.message 
    });
  }
});

module.exports = router; 