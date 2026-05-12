const mongoose = require('mongoose');

const evidenceSchema = new mongoose.Schema({
  dossierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dossier',
    required: true
  },
  type: {
    type: String,
    enum: ['note', 'image', 'file', 'report'],
    required: true
  },
  title: {
    type: String,
    trim: true,
    default: ''
  },
  content: {
    type: String,
    default: ''
  },
  fileName: {
    type: String,
    default: ''
  },
  originalName: {
    type: String,
    default: ''
  },
  fileSize: {
    type: Number,
    default: 0
  },
  mimeType: {
    type: String,
    default: ''
  },
  // Legacy field kept for backward compat with local dev
  filePath: {
    type: String,
    default: ''
  },
  // GridFS file ID for cloud storage
  gridfsFileId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Evidence', evidenceSchema);
