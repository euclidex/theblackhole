const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// CORS configuration
const allowedOrigins = {
  production: ['https://theblackhole.onrender.com'],
  development: ['http://localhost:3000']
};

app.use(cors({
  origin: (origin, callback) => {
    console.log('Incoming request from origin:', origin);
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowed = allowedOrigins[process.env.NODE_ENV || 'development'];
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('Allowed origins:', allowed);
    
    if (allowed.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      console.log('Blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`Incoming ${req.method} request to ${req.url}`);
  console.log('Headers:', req.headers);
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Import routes
const authRoutes = require('./routes/auth');
const sourcingRequestsRoutes = require('./routes/sourcing-requests');
const proposalsRoutes = require('./routes/proposals');

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/sourcing-requests', sourcingRequestsRoutes);
app.use('/api/proposals', proposalsRoutes);

// Test endpoint
app.get('/api/test', (req, res) => {
  console.log('Test endpoint hit');
  res.json({ message: 'API is working' });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  // Serve static files from the React app
  const staticPath = path.join(__dirname, '../client/build');
  console.log('Serving static files from:', staticPath);
  
  app.use(express.static(staticPath, {
    maxAge: '0', // Disable caching for static files
    etag: false,
    lastModified: false
  }));

  // Handle React routing by serving index.html for non-API routes
  app.get(/^(?!\/api).*/, (req, res) => {
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.sendFile(path.join(staticPath, 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Port configuration
const port = process.env.PORT || 5001;
app.listen(port, () => {
  const env = process.env.NODE_ENV || 'development';
  console.log(`Server running in ${env} mode on port ${port}`);
  console.log('CORS allowed origins:', allowedOrigins[env]);
  if (process.env.NODE_ENV === 'production') {
    console.log('Static files directory:', path.join(__dirname, '../client/build'));
  }
}); 