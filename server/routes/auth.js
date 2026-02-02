const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { comparePassword, sanitizeInput, loginLimiter } = require('../utils/security');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');

router.post(
  '/login',
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

    if (!sanitizeInput(regId)) {
      return res.status(400).json({ message: 'Invalid input format' });
    }

    const clientIp = req.ip;
    const rateLimitOk = await loginLimiter.check(clientIp);
    if (!rateLimitOk) {
      return res.status(429).json({
        message: 'Too many login attempts. Please try again later.'
      });
    }

    try {
      const user = await User.findOne({ regId });
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const isValidPassword = await comparePassword(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        const msg = 'JWT_SECRET is not set. Using development fallback secret. Do NOT use this in production.';
        if (process.env.NODE_ENV === 'production') {
          console.error(msg + ' Aborting login to avoid issuing weak tokens in production.');
          return res.status(500).json({ message: 'Server misconfiguration' });
        } else {
          console.warn(msg);
        }
      }

      const expiresIn = process.env.JWT_EXPIRES_IN || '1h';
      const token = jwt.sign(
        { sub: user._id.toString(), role: user.role },
        jwtSecret || 'dev-secret',
        { expiresIn }
      );

      res.json({ token, tokenType: 'Bearer', expiresIn, user: { id: user._id, regId: user.regId, role: user.role } });
    } catch (err) {
      console.error('Login error:', err && err.stack ? err.stack : err);
      res.status(500).json({ message: 'An error occurred during login' });
    }
  }
);

module.exports = router;
