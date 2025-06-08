const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const SOURCING_REQUESTS_FILE = path.join(__dirname, '..', 'sourcing_requests.json');

// Read sourcing requests from JSON file
let sourcingRequests = [];
try {
  const data = fs.readFileSync(SOURCING_REQUESTS_FILE, 'utf-8');
  sourcingRequests = JSON.parse(data);
} catch (err) {
  console.error('Could not load sourcing_requests.json. Using empty list.');
  sourcingRequests = [];
}

// Helper to save sourcing requests
const saveSourcingRequests = () => {
  fs.writeFileSync(SOURCING_REQUESTS_FILE, JSON.stringify(sourcingRequests, null, 2));
};

// Submit a proposal
router.post('/:requestId', (req, res) => {
  try {
    const { requestId } = req.params;
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
    
    const request = sourcingRequests.find(r => r.id === requestId);
    if (!request) {
      return res.status(404).json({ message: 'Sourcing request not found' });
    }

    const proposal = {
      id: Date.now().toString(),
      ...req.body,
      vendorEmail: decoded.email,
      status: 'pending',
      submittedAt: new Date().toISOString()
    };

    request.proposals.push(proposal);
    saveSourcingRequests();
    res.status(201).json(proposal);
  } catch (error) {
    res.status(500).json({ message: 'Error submitting proposal' });
  }
});

// Update proposal status
router.put('/:requestId/:proposalId', (req, res) => {
  try {
    const { requestId, proposalId } = req.params;
    const { status } = req.body;

    const request = sourcingRequests.find(r => r.id === requestId);
    if (!request) {
      return res.status(404).json({ message: 'Sourcing request not found' });
    }

    const proposal = request.proposals.find(p => p.id === proposalId);
    if (!proposal) {
      return res.status(404).json({ message: 'Proposal not found' });
    }

    proposal.status = status;
    saveSourcingRequests();
    res.json(proposal);
  } catch (error) {
    res.status(500).json({ message: 'Error updating proposal' });
  }
});

module.exports = router; 