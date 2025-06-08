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

// Get all sourcing requests
router.get('/', (req, res) => {
  res.json(sourcingRequests);
});

// Create a new sourcing request
router.post('/', (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
    
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
      createdBy: decoded.email,
      createdAt: new Date().toISOString(),
      proposals: []
    };

    sourcingRequests.push(newRequest);
    saveSourcingRequests();
    res.status(201).json(newRequest);
  } catch (error) {
    res.status(500).json({ message: 'Error creating sourcing request' });
  }
});

// Update a sourcing request
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const index = sourcingRequests.findIndex(r => r.id === id);
    
    if (index === -1) {
      return res.status(404).json({ message: 'Request not found' });
    }

    sourcingRequests[index] = { ...sourcingRequests[index], ...req.body };
    saveSourcingRequests();
    res.json(sourcingRequests[index]);
  } catch (error) {
    res.status(500).json({ message: 'Error updating sourcing request' });
  }
});

// Delete a sourcing request
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const index = sourcingRequests.findIndex(r => r.id === id);
    
    if (index === -1) {
      return res.status(404).json({ message: 'Request not found' });
    }

    sourcingRequests.splice(index, 1);
    saveSourcingRequests();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Error deleting sourcing request' });
  }
});

module.exports = router; 