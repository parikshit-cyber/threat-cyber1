const mongoose = require('mongoose');

const threatSchema = new mongoose.Schema({
  threatId: {
    type: String,
    unique: true,
    default: () => '#' + Math.random().toString(16).substr(2, 6).toUpperCase()
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  alias: {
    type: String,
    trim: true,
    default: ''
  },
  company: {
    type: String,
    trim: true,
    default: ''
  },
  role: {
    type: String,
    trim: true,
    default: ''
  },
  email: {
    type: String,
    trim: true,
    default: ''
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  dateOfBirth: {
    type: String,
    default: ''
  },
  idNumber: {
    type: String,
    trim: true,
    default: ''
  },
  address: {
    type: String,
    trim: true,
    default: ''
  },
  socialMedia: {
    type: String,
    trim: true,
    default: ''
  },
  familyInfo: {
    type: String,
    trim: true,
    default: ''
  },
  generalNotes: {
    type: String,
    trim: true,
    default: ''
  },
  evidenceCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Threat', threatSchema);
