const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Login Route
router.post('/login', async (req, res) => {
  const { regId, password } = req.body;
  try {
    const user = await User.findOne({ regId });
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.password !== password) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // In a real app, use JWT. Here we just return the user info.
    res.json({
      id: user._id,
      regId: user.regId,
      role: user.role
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
