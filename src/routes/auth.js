const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/user');

// JWT Secret (In production, put this in your .env file)
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_123';

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if fields are provided
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create and save the new user
    const user = new User({ name, email, password });
    await user.save();

    // Generate token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ message: 'Account created successfully', token });
  } catch (error) {
    // 🔍 THIS WILL PRINT THE EXACT ERROR IN YOUR TERMINAL
    console.error('REGISTRATION ERROR:', error);
    
    // Send the actual error message to the frontend alert for debugging
    res.status(500).json({ message: error.message || 'Server error during registration' });
  }
});

// ===================== LOGIN ROUTE =====================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({ message: 'Logged in successfully', token });
  } catch (error) {
    res.status(500).json({ message: 'Server error during login' });
  }
});

module.exports = router;