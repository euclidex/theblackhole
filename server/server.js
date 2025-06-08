const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());

// CORS configuration
const allowedOrigins = {
  production: ['https://the-black-hole.onrender.com'],
  development: ['http://localhost:3000']
};

app.use(cors({
  origin: allowedOrigins[process.env.NODE_ENV || 'development']
}));

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('../client/build'));
}

// Import and use routes
app.use('/api/sourcing-requests', require('./routes/sourcing-requests'));
app.use('/api/proposals', require('./routes/proposals'));
app.use('/api/auth', require('./routes/auth'));

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