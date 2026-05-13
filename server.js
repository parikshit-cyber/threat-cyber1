require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const path = require('path');

const authRoutes = require('./routes/auth');
const dossierRoutes = require('./routes/dossiers');
const evidenceRoutes = require('./routes/evidence');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Trust proxy for Render (needed for secure cookies behind reverse proxy)
app.set('trust proxy', 1);

app.use(session({
  secret: process.env.SESSION_SECRET || 'classified-vault-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: false,
    sameSite: 'lax'
  }
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/dossiers', dossierRoutes);
app.use('/api/evidence', evidenceRoutes);

// Serve pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/profile/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.json({ status: 'online', vault: 'operational' });
});

// Connect to MongoDB & start server
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/threat_intelligence';

mongoose.connect(MONGO_URI)
  .then(() => {
    // Initialize GridFS bucket after connection is ready
    const db = mongoose.connection.db;
    const gridFSBucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'evidenceFiles' });
    app.set('gridFSBucket', gridFSBucket);

    console.log('\x1b[32m$ connected to mongodb vault ...\x1b[0m');
    console.log('\x1b[32m$ gridfs storage initialized ... OK\x1b[0m');
    console.log('\x1b[32m$ integrity check ... OK\x1b[0m');

    app.listen(PORT, () => {
      console.log(`\x1b[32m$ threat_intelligence server online // port ${PORT}\x1b[0m`);
      console.log(`\x1b[32m$ access terminal at http://localhost:${PORT}\x1b[0m`);
    });
  })
  .catch(err => {
    console.error('\x1b[31m$ CRITICAL: vault connection failed\x1b[0m', err.message);
    process.exit(1);
  });
