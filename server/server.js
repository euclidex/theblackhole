const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://the-black-hole.onrender.com']
    : ['http://localhost:3000']
}));

// Import and use routes
app.use('/api/sourcing-requests', require('./routes/sourcing-requests'));
app.use('/api/proposals', require('./routes/proposals'));
app.use('/api/auth', require('./routes/auth'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Add port configuration for Render
const port = process.env.PORT || 5001;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 