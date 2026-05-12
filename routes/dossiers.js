const express = require('express');
const router = express.Router();
const Dossier = require('../models/Dossier');
const Evidence = require('../models/Evidence');

// GET /api/dossiers - List all dossiers
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
          { dossierId: regex }
        ]
      };
    }
    
    const dossiers = await Dossier.find(query).sort({ createdAt: -1 });
    res.json({ success: true, dossiers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/dossiers/stats - Get global stats
router.get('/stats', async (req, res) => {
  try {
    const dossierCount = await Dossier.countDocuments();
    const evidenceCount = await Evidence.countDocuments();
    const fileCount = await Evidence.countDocuments({ type: { $in: ['file', 'image'] } });
    
    res.json({
      success: true,
      stats: {
        dossiers: dossierCount,
        evidence: evidenceCount,
        files: fileCount
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/dossiers/:id - Get single dossier
router.get('/:id', async (req, res) => {
  try {
    const dossier = await Dossier.findById(req.params.id);
    if (!dossier) {
      return res.status(404).json({ success: false, message: 'DOSSIER NOT FOUND' });
    }
    res.json({ success: true, dossier });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/dossiers - Create new dossier
router.post('/', async (req, res) => {
  try {
    const dossier = new Dossier(req.body);
    await dossier.save();
    res.status(201).json({ success: true, dossier });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/dossiers/:id - Update dossier
router.put('/:id', async (req, res) => {
  try {
    const dossier = await Dossier.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!dossier) {
      return res.status(404).json({ success: false, message: 'DOSSIER NOT FOUND' });
    }
    res.json({ success: true, dossier });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/dossiers/:id - Delete dossier and all evidence
router.delete('/:id', async (req, res) => {
  try {
    const dossier = await Dossier.findById(req.params.id);
    if (!dossier) {
      return res.status(404).json({ success: false, message: 'DOSSIER NOT FOUND' });
    }
    
    // Delete all associated evidence files from GridFS
    const mongoose = require('mongoose');
    const bucket = req.app.get('gridFSBucket');
    const evidences = await Evidence.find({ dossierId: req.params.id });
    
    for (const ev of evidences) {
      if (ev.gridfsFileId && bucket) {
        try {
          await bucket.delete(new mongoose.Types.ObjectId(ev.gridfsFileId));
        } catch (e) { /* file may already be deleted */ }
      }
    }
    
    await Evidence.deleteMany({ dossierId: req.params.id });
    await Dossier.findByIdAndDelete(req.params.id);
    
    res.json({ success: true, message: 'DOSSIER PURGED' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
