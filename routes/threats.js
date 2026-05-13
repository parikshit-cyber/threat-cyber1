const express = require('express');
const router = express.Router();
const Threat = require('../models/Threat');
const Evidence = require('../models/Evidence');

// GET /api/threats - List all threats
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};
    
    if (search) {
      const regex = new RegExp(search, 'i');
      query = {
        $or: [
          { fullName: regex },
          { alias: regex },
          { company: regex },
          { email: regex },
          { phone: regex },
          { threatId: regex }
        ]
      };
    }
    
    const threats = await Threat.find(query).sort({ createdAt: -1 });
    res.json({ success: true, threats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/threats/stats - Get global stats
router.get('/stats', async (req, res) => {
  try {
    const threatCount = await Threat.countDocuments();
    const evidenceCount = await Evidence.countDocuments();
    const fileCount = await Evidence.countDocuments({ type: { $in: ['file', 'image'] } });
    
    res.json({
      success: true,
      stats: {
        threats: threatCount,
        evidence: evidenceCount,
        files: fileCount
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/threats/:id - Get single threat
router.get('/:id', async (req, res) => {
  try {
    const threat = await Threat.findById(req.params.id);
    if (!threat) {
      return res.status(404).json({ success: false, message: 'THREAT NOT FOUND' });
    }
    res.json({ success: true, threat });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/threats - Create new threat
router.post('/', async (req, res) => {
  try {
    const threat = new Threat(req.body);
    await threat.save();
    res.status(201).json({ success: true, threat });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/threats/:id - Update threat
router.put('/:id', async (req, res) => {
  try {
    const threat = await Threat.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!threat) {
      return res.status(404).json({ success: false, message: 'THREAT NOT FOUND' });
    }
    res.json({ success: true, threat });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/threats/:id - Delete threat and all evidence
router.delete('/:id', async (req, res) => {
  try {
    const threat = await Threat.findById(req.params.id);
    if (!threat) {
      return res.status(404).json({ success: false, message: 'THREAT NOT FOUND' });
    }
    
    // Delete all associated evidence files from GridFS
    const mongoose = require('mongoose');
    const bucket = req.app.get('gridFSBucket');
    const evidences = await Evidence.find({ threatId: req.params.id });
    
    for (const ev of evidences) {
      if (ev.gridfsFileId && bucket) {
        try {
          await bucket.delete(new mongoose.Types.ObjectId(ev.gridfsFileId));
        } catch (e) { /* file may already be deleted */ }
      }
    }
    
    await Evidence.deleteMany({ threatId: req.params.id });
    await Threat.findByIdAndDelete(req.params.id);
    
    res.json({ success: true, message: 'THREAT PURGED' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
