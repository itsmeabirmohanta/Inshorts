const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { comparePassword, sanitizeInput, loginLimiter } = require('../utils/security');

// Login Route
router.post('/login', async (req, res) => {
  const { regId, password } = req.body;
  
  // Input validation
  if (!regId || !password) {
    return res.status(400).json({ message: 'Registration ID and password are required' });
  }

  // Sanitize inputs
  if (!sanitizeInput(regId)) {
    return res.status(400).json({ message: 'Invalid input format' });
  }

  // Rate limiting
  const clientIp = req.ip || req.connection.remoteAddress;
  if (!loginLimiter.check(clientIp)) {
    return res.status(429).json({ 
      message: 'Too many login attempts. Please try again later.' 
    });
  }

  try {
    const user = await User.findOne({ regId });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Compare password (supports both hashed and plain text for backward compatibility)
    let isValidPassword = false;
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      // Password is hashed
      isValidPassword = await comparePassword(password, user.password);
    } else {
      // Legacy plain text password (for development/testing only)
      isValidPassword = user.password === password;
    }

    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Return user info (in production, use JWT tokens)
    res.json({
      id: user._id,
      regId: user.regId,
      role: user.role
    });
  } catch (err) {
    res.status(500).json({ message: 'An error occurred during login' });
  }
});

module.exports = router;
