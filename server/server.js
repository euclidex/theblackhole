const express = require('express');
const cors = require('cors');
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

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('../client/build'));
}

// Import routes
const authRoutes = require('./routes/auth');
const sourcingRequestsRoutes = require('./routes/sourcing-requests');
const proposalsRoutes = require('./routes/proposals');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/sourcing-requests', sourcingRequestsRoutes);
app.use('/api/proposals', proposalsRoutes);

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