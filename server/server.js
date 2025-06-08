const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());

// CORS configuration
const allowedOrigins = {
  production: ['https://theblackhole.onrender.com'],
  development: ['http://localhost:3000']
};

app.use(cors({
  origin: allowedOrigins[process.env.NODE_ENV || 'development']
}));

// Import routes
const authRoutes = require('./routes/auth');
const sourcingRequestsRoutes = require('./routes/sourcing-requests');
const proposalsRoutes = require('./routes/proposals');

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/sourcing-requests', sourcingRequestsRoutes);
app.use('/api/proposals', proposalsRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  // Serve static files from the React app
  app.use(express.static(path.join(__dirname, '../client/build')));

  // The "catchall" handler: for any request that doesn't
  // match one above, send back the index.html file.
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
  
  app.get('/*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Port configuration
const port = process.env.PORT || 5001;
app.listen(port, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${port}`);
}); 