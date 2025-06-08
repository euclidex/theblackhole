const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
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
    console.log('Successfully saved sourcing requests');
    return true;
  } catch (err) {
    console.error('Error saving sourcing requests:', err);
    return false;
  }
};

// Submit a proposal
router.post('/', authenticateToken, (req, res) => {
  try {
    console.log('POST /proposals');
    console.log('Request body:', req.body);
    
    const { requestId, price, deliveryDate, notes } = req.body;
    
    if (!requestId || !price || !deliveryDate) {
      console.log('Missing required fields');
      return res.status(400).json({ 
        message: 'Missing required fields',
        required: ['requestId', 'price', 'deliveryDate']
      });
    }

    const request = sourcingRequests.find(r => r.id === requestId);
    if (!request) {
      console.log('Sourcing request not found:', requestId);
      return res.status(404).json({ message: 'Sourcing request not found' });
    }

    // Check if request is still open
    if (request.status?.toLowerCase() !== 'open') {
      console.log('Request is not open:', request.status);
      return res.status(400).json({ message: 'This request is no longer accepting proposals' });
    }

    // Check if delivery date is after request deadline
    if (request.deadline && new Date(deliveryDate) > new Date(request.deadline)) {
      console.log('Delivery date is after deadline:', { delivery: deliveryDate, deadline: request.deadline });
      return res.status(400).json({ message: 'Delivery date cannot be after the request deadline' });
    }

    const proposal = {
      id: Date.now().toString(),
      requestId,
      vendorId: req.user.email,
      vendorName: req.user.email.split('@')[0],
      price,
      deliveryDate,
      notes,
      status: 'Pending',
      submittedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      statusHistory: [{
        status: 'Pending',
        updatedAt: new Date().toISOString(),
        updatedBy: req.user.email
      }]
    };

    console.log('Creating new proposal:', proposal);

    if (!request.proposals) {
      request.proposals = [];
    }
    request.proposals.push(proposal);

    if (!saveSourcingRequests()) {
      throw new Error('Failed to save proposal');
    }

    console.log('Proposal created successfully');
    res.status(201).json(proposal);
  } catch (error) {
    console.error('Error in POST /proposals:', error);
    res.status(500).json({ 
      message: 'Error submitting proposal',
      error: error.message
    });
  }
});

// Update proposal status
router.put('/:proposalId/status', authenticateToken, (req, res) => {
  try {
    console.log(`PUT /proposals/${req.params.proposalId}/status`);
    console.log('Request body:', req.body);
    
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    // Find the request containing this proposal
    const request = sourcingRequests.find(r => 
      r.proposals?.some(p => p.id === req.params.proposalId)
    );

    if (!request) {
      console.log('Request not found for proposal:', req.params.proposalId);
      return res.status(404).json({ message: 'Proposal not found' });
    }

    const proposal = request.proposals.find(p => p.id === req.params.proposalId);
    if (!proposal) {
      console.log('Proposal not found:', req.params.proposalId);
      return res.status(404).json({ message: 'Proposal not found' });
    }

    // Only procurement officers can update status
    if (req.user.role !== 'procurement') {
      console.log('Unauthorized - only procurement officers can update proposal status');
      return res.status(403).json({ message: 'Only procurement officers can update proposal status' });
    }

    proposal.status = status;
    proposal.updatedAt = new Date().toISOString();
    proposal.updatedBy = req.user.email;

    if (!proposal.statusHistory) {
      proposal.statusHistory = [];
    }

    proposal.statusHistory.push({
      status,
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.email
    });

    if (!saveSourcingRequests()) {
      throw new Error('Failed to save status update');
    }

    console.log('Proposal status updated successfully');
    res.json(proposal);
  } catch (error) {
    console.error('Error in PUT /proposals/:proposalId/status:', error);
    res.status(500).json({ 
      message: 'Error updating proposal status',
      error: error.message
    });
  }
});

module.exports = router; 