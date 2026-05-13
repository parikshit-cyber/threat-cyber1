require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
let MongoStore = require('connect-mongo');
if (MongoStore.default) MongoStore = MongoStore.default;
const path = require('path');

const authRoutes = require('./routes/auth');
const threatRoutes = require('./routes/threats');
const evidenceRoutes = require('./routes/evidence');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/threat_intelligence';

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Trust proxy for Render (needed for secure cookies behind reverse proxy)
app.set('trust proxy', 1);

// Persistent Session Store using MongoDB
app.use(session({
  secret: process.env.SESSION_SECRET || 'classified-vault-secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: MONGO_URI,
    collectionName: 'sessions',
    ttl: 24 * 60 * 60 // 1 day
  }),
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/threats', threatRoutes);
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
console.log('$ initializing vault connection ...');
if (!process.env.MONGODB_URI && process.env.NODE_ENV === 'production') {
  console.warn('\x1b[33m$ WARNING: MONGODB_URI not found in environment. Deployment may fail.\x1b[0m');
}

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
    });
  })
  .catch(err => {
    console.error('\x1b[31m$ CRITICAL: vault connection failed\x1b[0m');
    console.error('\x1b[31m$ ERROR_DETAILS:\x1b[0m', err.message);
    if (err.message.includes('ECONNREFUSED')) {
      console.error('\x1b[33m$ HINT: Ensure MONGODB_URI is set correctly in Render environment variables.\x1b[0m');
    }
    process.exit(1);
  });
