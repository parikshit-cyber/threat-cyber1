const express = require('express');
const router = express.Router();
const multer = require('multer');
const mongoose = require('mongoose');
const Evidence = require('../models/Evidence');
const Threat = require('../models/Threat');

// Use memory storage — file buffer goes to GridFS, NOT disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 16 * 1024 * 1024 } // 16MB (MongoDB doc limit)
});

// Helper: get GridFS bucket from Express app
function getBucket(req) {
  return req.app.get('gridFSBucket');
}

// Helper: upload buffer to GridFS, returns fileId
function uploadToGridFS(bucket, buffer, filename, mimeType) {
  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(filename, {
      contentType: mimeType
    });
    uploadStream.on('finish', () => resolve(uploadStream.id));
    uploadStream.on('error', reject);
    uploadStream.end(buffer);
  });
}

// Helper: delete file from GridFS (silent on error)
async function deleteFromGridFS(bucket, fileId) {
  try {
    if (fileId) await bucket.delete(new mongoose.Types.ObjectId(fileId));
  } catch (e) { /* file may not exist */ }
}

// GET /api/evidence/threat/:threatId - List evidence for a threat
router.get('/threat/:threatId', async (req, res) => {
  try {
    const evidence = await Evidence.find({ threatId: req.params.threatId })
      .sort({ createdAt: -1 });
    res.json({ success: true, evidence });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/evidence/note - Add a note
router.post('/note', async (req, res) => {
  try {
    const { threatId, title, content } = req.body;
    
    const evidence = new Evidence({
      threatId,
      type: 'note',
      title: title || 'Untitled Note',
      content
    });
    
    await evidence.save();
    
    const count = await Evidence.countDocuments({ threatId });
    await Threat.findByIdAndUpdate(threatId, { evidenceCount: count });
    
    res.status(201).json({ success: true, evidence });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/evidence/report - Add a report
router.post('/report', async (req, res) => {
  try {
    const { threatId, title, content } = req.body;
    
    const evidence = new Evidence({
      threatId,
      type: 'report',
      title: title || 'Untitled Report',
      content
    });
    
    await evidence.save();
    
    const count = await Evidence.countDocuments({ threatId });
    await Threat.findByIdAndUpdate(threatId, { evidenceCount: count });
    
    res.status(201).json({ success: true, evidence });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/evidence/image - Upload an image
router.post('/image', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    
    const bucket = getBucket(req);
    const gridfsFileId = await uploadToGridFS(
      bucket, req.file.buffer, req.file.originalname, req.file.mimetype
    );
    
    const evidence = new Evidence({
      threatId: req.body.threatId,
      type: 'image',
      title: req.body.title || req.file.originalname,
      fileName: req.file.originalname,
      originalName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      gridfsFileId
    });
    
    await evidence.save();
    
    const count = await Evidence.countDocuments({ threatId: req.body.threatId });
    await Threat.findByIdAndUpdate(req.body.threatId, { evidenceCount: count });
    
    res.status(201).json({ success: true, evidence });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/evidence/file - Upload a file
router.post('/file', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    
    const bucket = getBucket(req);
    const gridfsFileId = await uploadToGridFS(
      bucket, req.file.buffer, req.file.originalname, req.file.mimetype
    );
    
    const evidence = new Evidence({
      threatId: req.body.threatId,
      type: 'file',
      title: req.body.title || req.file.originalname,
      fileName: req.file.originalname,
      originalName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      gridfsFileId
    });
    
    await evidence.save();
    
    const count = await Evidence.countDocuments({ threatId: req.body.threatId });
    await Threat.findByIdAndUpdate(req.body.threatId, { evidenceCount: count });
    
    res.status(201).json({ success: true, evidence });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Helper: stream a file from GridFS to response
async function streamGridFSFile(req, res, evidenceId, disposition) {
  try {
    const evidence = await Evidence.findById(evidenceId);
    if (!evidence) {
      return res.status(404).json({ success: false, message: 'EVIDENCE NOT FOUND' });
    }
    if (!evidence.gridfsFileId) {
      return res.status(404).json({ success: false, message: 'FILE NOT IN VAULT STORAGE' });
    }

    const bucket = getBucket(req);
    const fileName = evidence.originalName || evidence.fileName || 'file';

    res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Type', evidence.mimeType || 'application/octet-stream');
    if (evidence.fileSize) res.setHeader('Content-Length', evidence.fileSize);

    const downloadStream = bucket.openDownloadStream(
      new mongoose.Types.ObjectId(evidence.gridfsFileId)
    );

    downloadStream.on('error', () => {
      if (!res.headersSent) {
        res.status(404).json({ success: false, message: 'FILE MISSING FROM VAULT' });
      }
    });

    downloadStream.pipe(res);
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

// GET /api/evidence/:id/download
router.get('/:id/download', (req, res) => {
  streamGridFSFile(req, res, req.params.id, 'attachment');
});

// GET /api/evidence/:id/view
router.get('/:id/view', (req, res) => {
  streamGridFSFile(req, res, req.params.id, 'inline');
});

// DELETE /api/evidence/:id
router.delete('/:id', async (req, res) => {
  try {
    const evidence = await Evidence.findById(req.params.id);
    if (!evidence) {
      return res.status(404).json({ success: false, message: 'EVIDENCE NOT FOUND' });
    }
    
    if (evidence.gridfsFileId) {
      const bucket = getBucket(req);
      await deleteFromGridFS(bucket, evidence.gridfsFileId);
    }
    
    const threatId = evidence.threatId;
    await Evidence.findByIdAndDelete(req.params.id);
    
    const count = await Evidence.countDocuments({ threatId });
    await Threat.findByIdAndUpdate(threatId, { evidenceCount: count });
    
    res.json({ success: true, message: 'EVIDENCE PURGED' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/evidence/:id
router.get('/:id', async (req, res) => {
  try {
    const evidence = await Evidence.findById(req.params.id);
    if (!evidence) {
      return res.status(404).json({ success: false, message: 'EVIDENCE NOT FOUND' });
    }
    res.json({ success: true, evidence });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/evidence/:id
router.put('/:id', async (req, res) => {
  try {
    const evidence = await Evidence.findByIdAndUpdate(
      req.params.id,
      { title: req.body.title, content: req.body.content },
      { new: true }
    );
    if (!evidence) {
      return res.status(404).json({ success: false, message: 'EVIDENCE NOT FOUND' });
    }
    res.json({ success: true, evidence });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
