const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not configured');
}
const JWT_SECRET = process.env.JWT_SECRET;

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
    const token = jwt.sign(
  {
    userId: user._id.toString(),
    role: user.role
  },
  JWT_SECRET,
  {
    expiresIn: '7d'
  }
);

res.cookie('forme_token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000
});

res.status(201).json({
  message: 'Account created successfully'
});

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
    const token = jwt.sign(
  {
    userId: user._id.toString(),
    role: user.role
  },
  JWT_SECRET,
  {
    expiresIn: '7d'
  }
);

    res.cookie('forme_token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000
});

res.json({
  message: 'Login successful'
});

  } catch (error) {
    res.status(500).json({ message: 'Server error during login' });
  }
});
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('-password');

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Auth check error:', error);

    res.status(500).json({
      message: 'Failed to verify authentication'
    });
  }
});

router.post('/logout', (req, res) => {
    res.clearCookie('forme_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
    });

    res.json({
        message: 'Logged out successfully'
    });
});

module.exports = router;