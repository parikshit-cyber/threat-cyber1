const express = require('express');
const router = express.Router();

const ACCESS_CODE = process.env.ACCESS_CODE || '1111';

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { code } = req.body;
  
  if (code === ACCESS_CODE) {
    req.session.authenticated = true;
    return res.json({ success: true, message: 'ACCESS GRANTED' });
  }
  
  return res.status(401).json({ success: false, message: 'ACCESS DENIED // INVALID CLEARANCE CODE' });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true, message: 'SESSION TERMINATED' });
});

// GET /api/auth/check
router.get('/check', (req, res) => {
  res.json({ authenticated: !!req.session.authenticated });
});

module.exports = router;
