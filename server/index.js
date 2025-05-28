const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

const fs = require('fs');
const path = require('path');

const USERS_FILE = path.join(__dirname, 'users.json');
const SOURCING_REQUESTS_FILE = path.join(__dirname, 'sourcing_requests.json');

// Read users from JSON file
let users = [];
try {
  console.log('Reading users from:', USERS_FILE);
  const data = fs.readFileSync(USERS_FILE, 'utf-8');
  users = JSON.parse(data);
  console.log('Loaded users:', users.map(u => ({ ...u, password: '***' })));
} catch (err) {
  console.error('Could not load users.json:', err);
  users = [];
}

// Read sourcing requests from JSON file
let sourcingRequests = [];
try {
  const data = fs.readFileSync(SOURCING_REQUESTS_FILE, 'utf-8');
  sourcingRequests = JSON.parse(data);
} catch (err) {
  console.error('Could not load sourcing_requests.json. Using empty list.');
  sourcingRequests = [];
}

// Helper to save users to JSON
const saveUsers = () => {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
};

// Helper to save sourcing requests
const saveSourcingRequests = () => {
  fs.writeFileSync(SOURCING_REQUESTS_FILE, JSON.stringify(sourcingRequests, null, 2));
};

// Add request logger
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Configure CORS - more permissive version
app.use(cors({
    origin: true, // Allow all origins
    credentials: true, // Allow credentials
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

// Body parser with increased limit
app.use(bodyParser.json({
    limit: '10mb'
}));

// Add this near the top with other middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'secret123', (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// POST /login
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  console.log('Login attempt for:', email);
  
  // Read fresh user data
  let currentUsers = [];
  try {
    const userData = fs.readFileSync(USERS_FILE, 'utf-8');
    currentUsers = JSON.parse(userData);
    console.log('Current users in file:', currentUsers.map(u => ({ 
      email: u.email, 
      name: u.name,
      role: u.role 
    })));
  } catch (err) {
    console.error('Error reading users file during login:', err);
  }
  
  const user = currentUsers.find(u => u.email === email && u.password === password);
  console.log('Found user:', user ? { 
    email: user.email, 
    name: user.name,
    role: user.role 
  } : null);
  
  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  const token = jwt.sign(
    { email: user.email, role: user.role },
    process.env.JWT_SECRET || 'secret123',
    { expiresIn: '24h' }
  );

  const response = { 
    token, 
    role: user.role,
    name: user.email
  };
  console.log('Sending response:', { 
    role: response.role,
    name: response.name 
  });

  res.json(response);
});

app.post('/register', (req, res) => {
    try {
        console.log('Received registration request with body:', req.body);
        const { name, email, password, role } = req.body;

        // Log the extracted values
        console.log('Extracted values:', { name, email, password: '***', role });

        // Validate required fields
        if (!email || !password || !role) {
            console.log('Missing required fields');
            return res.status(400).json({ 
                message: 'Email, password, and role are required' 
            });
        }

        // Check if email is already used
        const existingUser = users.find(u => u.email === email);
        if (existingUser) {
            console.log('Email already exists:', email);
            return res.status(400).json({ message: 'Email already registered' });
        }

        // Create new user with all fields
        const newUser = { 
            name,
            email, 
            password, 
            role 
        };
        users.push(newUser);
        saveUsers();
        console.log('New user created:', { ...newUser, password: '***' });

        const token = jwt.sign(
            { email: newUser.email, role: newUser.role },
            process.env.JWT_SECRET || 'secret123',
            { expiresIn: '24h' }
        );

        // Add name to response
        res.json({ 
            token, 
            role: newUser.role,
            name: newUser.email
        });
    } catch (error) {
        console.error('Registration error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ message: 'Registration failed. Try again.' });
    }
});

// ✅ Health check (optional)
app.get('/', (req, res) => {
  res.send('Hospital sourcing backend is running.');
});

// Create an API router
const apiRouter = express.Router();

// Move the sourcing requests endpoints to the API router
apiRouter.post('/sourcing-requests', (req, res) => {
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
      status: 'Open',
      createdAt: new Date().toISOString(),
      createdBy: decoded.email,
      proposals: [],
    };

    sourcingRequests.push(newRequest);
    saveSourcingRequests();

    res.status(201).json(newRequest);
  } catch (error) {
    console.error('Error creating request:', error);
    res.status(500).json({ message: 'Failed to create request' });
  }
});

apiRouter.get('/sourcing-requests', (req, res) => {
  res.json(sourcingRequests);
});

// Move the proposals endpoints to the API router
apiRouter.post('/proposals', (req, res) => {
  try {
    console.log('Received proposal request:', req.body);
    console.log('Auth header:', req.headers.authorization);
    
    const { requestId, price, deliveryDate, notes } = req.body;
    
    // Validate required fields
    if (!requestId || !price || !deliveryDate || !notes) {
      console.log('Missing required fields');
      return res.status(400).json({ 
        message: 'All fields are required' 
      });
    }
    
    // Get vendor info from token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      console.log('No token provided');
      return res.status(401).json({ message: 'No authorization token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
    console.log('Decoded token:', decoded);
    
    const vendor = users.find(u => u.email === decoded.email);
    console.log('Found vendor:', vendor ? { ...vendor, password: '***' } : null);

    if (!vendor) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const request = sourcingRequests.find(r => r.id === requestId);
    console.log('Found request:', request);
    
    if (!request) {
      return res.status(404).json({ message: 'Sourcing request not found' });
    }

    const proposal = {
      id: Date.now().toString(),
      requestId,
      vendorId: vendor.email,
      vendorName: vendor.name,
      price,
      deliveryDate,
      notes,
      status: PROPOSAL_STATUSES.PENDING,
      submittedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    console.log('Creating proposal:', proposal);
    request.proposals.push(proposal);
    saveSourcingRequests();
    console.log('Proposal saved successfully');

    res.status(201).json(proposal);
  } catch (error) {
    console.error('Error creating proposal:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Failed to submit proposal: ' + error.message });
  }
});

apiRouter.get('/proposals/vendor', (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
    
    const vendorProposals = sourcingRequests.flatMap(request => 
      request.proposals
        .filter(proposal => proposal.vendorId === decoded.email)
        .map(proposal => ({
          ...proposal,
          requestTitle: request.title,
          requestCategory: request.category
        }))
    );

    res.json(vendorProposals);
  } catch (error) {
    console.error('Error fetching vendor proposals:', error);
    res.status(500).json({ message: 'Failed to fetch proposals' });
  }
});

// Add this near the top with other constants
const PROPOSAL_STATUSES = {
  PENDING: 'Pending',
  SHORTLISTED: 'Shortlisted',
  REJECTED: 'Rejected',
  IGNORED: 'Ignored'
};

// Update the proposal status endpoint
apiRouter.put('/proposals/:proposalId/status', (req, res) => {
  try {
    const { proposalId } = req.params;
    const { status } = req.body;
    
    // Get user info from token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No authorization token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
    console.log('Decoded token:', decoded);
    
    const vendor = users.find(u => u.email === decoded.email);
    console.log('Found vendor:', vendor ? { ...vendor, password: '***' } : null);

    if (!vendor) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Find the request containing this proposal
    const request = sourcingRequests.find(r => 
      r.proposals.some(p => p.id === proposalId)
    );

    if (!request) {
      return res.status(404).json({ message: 'Sourcing request not found' });
    }

    // Check if user is authorized (is the request creator)
    if (request.createdBy !== decoded.email) {
      return res.status(403).json({ message: 'Not authorized to update proposal status' });
    }

    // Update the proposal status
    const proposal = request.proposals.find(p => p.id === proposalId);
    proposal.status = status;
    proposal.updatedAt = new Date().toISOString();
    proposal.updatedBy = decoded.email;
    proposal.statusHistory = proposal.statusHistory || [];
    proposal.statusHistory.push({
      status,
      updatedAt: new Date().toISOString(),
      updatedBy: decoded.email
    });

    saveSourcingRequests();
    res.json(proposal);
  } catch (error) {
    console.error('Error updating proposal status:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Failed to update proposal status' });
  }
});

// Add an endpoint to get proposals for a request
apiRouter.get('/sourcing-requests/:requestId/proposals', (req, res) => {
  try {
    const { requestId } = req.params;
    const request = sourcingRequests.find(r => r.id === requestId);
    
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Get user info from token
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');

    // Check if user is authorized (is the request creator)
    if (request.createdBy !== decoded.email) {
      return res.status(403).json({ message: 'Not authorized to view proposals' });
    }

    // Return proposals with additional metadata
    const proposals = request.proposals.map(p => ({
      ...p,
      requestTitle: request.title,
      requestCategory: request.category
    }));

    res.json(proposals);
  } catch (error) {
    console.error('Error fetching proposals:', error);
    res.status(500).json({ message: 'Failed to fetch proposals' });
  }
});

// Delete a sourcing request
apiRouter.delete('/sourcing-requests/:requestId', (req, res) => {
  try {
    const { requestId } = req.params;
    
    // Get user info from token
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
    
    // Find the request
    const requestIndex = sourcingRequests.findIndex(r => r.id === requestId);
    if (requestIndex === -1) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Check if user is the creator
    if (sourcingRequests[requestIndex].createdBy !== decoded.email) {
      return res.status(403).json({ message: 'Not authorized to delete this request' });
    }

    // Remove the request
    sourcingRequests.splice(requestIndex, 1);
    saveSourcingRequests();

    res.json({ message: 'Request deleted successfully' });
  } catch (error) {
    console.error('Error deleting request:', error);
    res.status(500).json({ message: 'Failed to delete request' });
  }
});

// Update a sourcing request
apiRouter.put('/sourcing-requests/:requestId', (req, res) => {
  try {
    const { requestId } = req.params;
    const updates = req.body;
    
    // Get user info from token
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
    
    // Find the request
    const request = sourcingRequests.find(r => r.id === requestId);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Check if user is the creator
    if (request.createdBy !== decoded.email) {
      return res.status(403).json({ message: 'Not authorized to edit this request' });
    }

    // Update allowed fields
    const allowedUpdates = ['title', 'category', 'description', 'quantity', 'deadline', 'requirements'];
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        request[field] = updates[field];
      }
    });

    saveSourcingRequests();
    res.json(request);
  } catch (error) {
    console.error('Error updating request:', error);
    res.status(500).json({ message: 'Failed to update request' });
  }
});

// Get a single sourcing request with its proposals
apiRouter.get('/sourcing-requests/:requestId', (req, res) => {
  try {
    const { requestId } = req.params;
    
    const request = sourcingRequests.find(r => r.id === requestId);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    res.json(request);
  } catch (error) {
    console.error('Error fetching request:', error);
    res.status(500).json({ message: 'Failed to fetch request' });
  }
});

// Use the API router with the /api prefix
app.use('/api', apiRouter);

// Add this function to generate random sourcing requests
function generateRandomRequests() {
  const titles = [
    'Emergency Medical Supplies',
    'Hospital Beds Procurement',
    'Surgical Equipment Update',
    'Laboratory Testing Kits',
    'Patient Monitoring Systems',
    'Sterilization Equipment',
    'Medical Waste Management',
    'Diagnostic Imaging Devices',
    'Respiratory Care Equipment',
    'Pharmaceutical Storage System'
  ];

  const descriptions = [
    'Urgent procurement needed for essential medical supplies',
    'Modern hospital beds with advanced features required',
    'Upgrading surgical equipment for multiple operating rooms',
    'Comprehensive testing kits for various medical tests',
    'Advanced patient monitoring systems for ICU',
    'Industrial-grade sterilization equipment for medical instruments',
    'Efficient medical waste management system needed',
    'State-of-the-art diagnostic imaging equipment',
    'High-quality respiratory care equipment for critical care',
    'Temperature-controlled pharmaceutical storage solutions'
  ];

  const requirements = [
    'Must meet ISO standards',
    'CE certification required',
    'FDA approved products only',
    'Warranty minimum 2 years',
    'Training and support included',
    'Express delivery required',
    'Installation service included',
    'Regular maintenance support',
    'Compatible with existing systems',
    'Energy efficient solutions preferred'
  ];

  const categories = [
    'Medical Equipment',
    'Pharmaceuticals',
    'Supplies',
    'Services',
    'Maintenance'
  ];

  const currentDate = new Date();
  const requests = titles.map((title, index) => {
    // Set deadline between 1 to 3 months from now
    const deadline = new Date(currentDate);
    deadline.setDate(deadline.getDate() + Math.floor(Math.random() * 60 + 30));

    return {
      id: Date.now().toString() + index,
      title,
      category: categories[Math.floor(Math.random() * categories.length)],
      description: descriptions[index],
      quantity: Math.floor(Math.random() * 100 + 1).toString(),
      deadline: deadline.toISOString().split('T')[0],
      requirements: requirements[index],
      status: 'Open',
      createdBy: 'jon@email.com',
      createdAt: new Date().toISOString(),
      proposals: []
    };
  });

  return requests;
}

// Add this endpoint to reset the data
app.post('/api/reset-data', (req, res) => {
  try {
    const newRequests = generateRandomRequests();
    fs.writeFileSync(
      path.join(__dirname, 'sourcing_requests.json'), 
      JSON.stringify(newRequests, null, 2)
    );
    res.json({ message: 'Data reset successful', requests: newRequests });
  } catch (error) {
    console.error('Error resetting data:', error);
    res.status(500).json({ message: 'Failed to reset data' });
  }
});

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});