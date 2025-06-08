const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const sourcingRequestsService = require('../services/sourcing-requests');

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

    const savedProposal = sourcingRequestsService.addProposal(requestId, proposal);
    if (!savedProposal) {
      throw new Error('Failed to save proposal');
    }

    console.log('Proposal created successfully');
    res.status(201).json(savedProposal);
  } catch (error) {
    console.error('Error in POST /proposals:', error);
    res.status(500).json({ 
      message: error.message || 'Error submitting proposal'
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

    // Only procurement officers can update status
    if (req.user.role !== 'procurement') {
      console.log('Unauthorized - only procurement officers can update proposal status');
      return res.status(403).json({ message: 'Only procurement officers can update proposal status' });
    }

    const updatedProposal = sourcingRequestsService.updateProposalStatus(
      req.params.proposalId,
      status,
      req.user.email
    );

    if (!updatedProposal) {
      throw new Error('Failed to update proposal status');
    }

    console.log('Proposal status updated successfully');
    res.json(updatedProposal);
  } catch (error) {
    console.error('Error in PUT /proposals/:proposalId/status:', error);
    res.status(500).json({ 
      message: error.message || 'Error updating proposal status'
    });
  }
});

module.exports = router; 