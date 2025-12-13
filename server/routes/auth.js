const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { comparePassword, sanitizeInput, loginLimiter } = require('../utils/security');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');

// Login Route
router.post(
  '/login',
  // Validation middleware
  [
    body('regId').isString().trim().isLength({ min: 1 }).withMessage('regId is required'),
    body('password').isString().isLength({ min: 1 }).withMessage('password is required')
  ],
  async (req, res) => {
    // Validate request body
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { regId, password } = req.body;

    // Sanitize regId
    if (!sanitizeInput(regId)) {
      return res.status(400).json({ message: 'Invalid input format' });
    }

    // Rate limiting (requires express trust proxy configured in production)
    const clientIp = req.ip;
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

      // Compare password (expecting hashed password)
      const isValidPassword = await comparePassword(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Issue JWT token
      if (!process.env.JWT_SECRET) {
        console.warn('JWT_SECRET is not set. Tokens will be unsigned. Set JWT_SECRET in production.');
      }
      const token = jwt.sign(
        { sub: user._id.toString(), role: user.role },
        process.env.JWT_SECRET || 'dev-secret',
        { expiresIn: '1h' }
      );

      // Return token and minimal user info
      res.json({ token, user: { id: user._id, regId: user.regId, role: user.role } });
    } catch (err) {
      console.error('Login error:', err && err.stack ? err.stack : err);
      res.status(500).json({ message: 'An error occurred during login' });
    }
  }
);

module.exports = router;
