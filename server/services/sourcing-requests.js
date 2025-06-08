const fs = require('fs');
const path = require('path');

const SOURCING_REQUESTS_FILE = path.join(__dirname, '..', 'sourcing_requests.json');

// Read sourcing requests from JSON file
const readSourcingRequests = () => {
  try {
    const data = fs.readFileSync(SOURCING_REQUESTS_FILE, 'utf-8');
    const requests = JSON.parse(data);
    console.log(`Read ${requests.length} sourcing requests from file`);
    return requests;
  } catch (err) {
    console.error('Could not load sourcing_requests.json:', err);
    return [];
  }
};

// Save sourcing requests to JSON file
const saveSourcingRequests = (requests) => {
  try {
    fs.writeFileSync(SOURCING_REQUESTS_FILE, JSON.stringify(requests, null, 2));
    console.log(`Saved ${requests.length} sourcing requests to file`);
    return true;
  } catch (err) {
    console.error('Error saving sourcing requests:', err);
    return false;
  }
};

// Add a proposal to a request
const addProposal = (requestId, proposal) => {
  const requests = readSourcingRequests();
  const request = requests.find(r => r.id === requestId);
  
  if (!request) {
    throw new Error('Sourcing request not found');
  }

  if (request.status?.toLowerCase() !== 'open') {
    throw new Error('This request is no longer accepting proposals');
  }

  if (!request.proposals) {
    request.proposals = [];
  }

  request.proposals.push(proposal);
  return saveSourcingRequests(requests) ? proposal : null;
};

// Update a proposal's status
const updateProposalStatus = (proposalId, status, updatedBy) => {
  const requests = readSourcingRequests();
  const request = requests.find(r => r.proposals?.some(p => p.id === proposalId));
  
  if (!request) {
    throw new Error('Proposal not found');
  }

  const proposal = request.proposals.find(p => p.id === proposalId);
  if (!proposal) {
    throw new Error('Proposal not found');
  }

  proposal.status = status;
  proposal.updatedAt = new Date().toISOString();
  proposal.updatedBy = updatedBy;

  if (!proposal.statusHistory) {
    proposal.statusHistory = [];
  }

  proposal.statusHistory.push({
    status,
    updatedAt: new Date().toISOString(),
    updatedBy
  });

  return saveSourcingRequests(requests) ? proposal : null;
};

// Get all sourcing requests
const getAllRequests = () => {
  return readSourcingRequests();
};

// Get a single request by ID
const getRequestById = (id) => {
  const requests = readSourcingRequests();
  return requests.find(r => r.id === id);
};

// Create a new request
const createRequest = (request) => {
  const requests = readSourcingRequests();
  requests.push(request);
  return saveSourcingRequests(requests) ? request : null;
};

// Update a request
const updateRequest = (id, updates) => {
  const requests = readSourcingRequests();
  const index = requests.findIndex(r => r.id === id);
  
  if (index === -1) {
    throw new Error('Request not found');
  }

  requests[index] = { ...requests[index], ...updates };
  return saveSourcingRequests(requests) ? requests[index] : null;
};

// Delete a request
const deleteRequest = (id) => {
  const requests = readSourcingRequests();
  const index = requests.findIndex(r => r.id === id);
  
  if (index === -1) {
    throw new Error('Request not found');
  }

  const deletedRequest = requests[index];
  requests.splice(index, 1);
  return saveSourcingRequests(requests) ? deletedRequest : null;
};

module.exports = {
  getAllRequests,
  getRequestById,
  createRequest,
  updateRequest,
  deleteRequest,
  addProposal,
  updateProposalStatus
}; 