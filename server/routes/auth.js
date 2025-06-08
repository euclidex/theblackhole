const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const USERS_FILE = path.join(__dirname, '..', 'users.json');

// Read users from JSON file
let users = [];
try {
  const data = fs.readFileSync(USERS_FILE, 'utf-8');
  users = JSON.parse(data);
} catch (err) {
  console.error('Could not load users.json:', err);
  users = [];
}

// Helper to save users to JSON
const saveUsers = () => {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
};

// Login route
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  
  const user = users.find(u => u.email === email && u.password === password);
  
  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  const token = jwt.sign(
    { email: user.email, role: user.role },
    process.env.JWT_SECRET || 'secret123',
    { expiresIn: '24h' }
  );

  res.json({ 
    token, 
    role: user.role,
    name: user.email
  });
});

// Register route
router.post('/register', (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ 
        message: 'Email, password, and role are required' 
      });
    }

    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const newUser = { name, email, password, role };
    users.push(newUser);
    saveUsers();

    const token = jwt.sign(
      { email: newUser.email, role: newUser.role },
      process.env.JWT_SECRET || 'secret123',
      { expiresIn: '24h' }
    );

    res.json({ 
      token, 
      role: newUser.role,
      name: newUser.email
    });
  } catch (error) {
    res.status(500).json({ message: 'Registration failed. Try again.' });
  }
});

module.exports = router; 