const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const config = require('./config/env');
const { connectDatabase } = require('./config/database');
const { seedInitialAdmin } = require('./services/seedService');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const orderRoutes = require('./routes/orderRoutes');
const interviewRoutes = require('./routes/interviewRoutes');
const photoRoutes = require('./routes/photoRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Security Headers with Helmet
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false, // Don't restrict frontend embeds/fonts
  })
);

// CORS configuration (allow requests from frontend with credentials)
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'http://localhost:5500',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5000',
  'http://127.0.0.1:5500',
  'http://127.0.0.1:8080',
  'http://localhost:8080',
];

if (config.CLIENT_URL && !allowedOrigins.includes(config.CLIENT_URL)) {
  allowedOrigins.push(config.CLIENT_URL);
}

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl, or same-origin static)
      if (!origin || allowedOrigins.indexOf(origin) !== -1 || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive for API consumers
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsers
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(cookieParser());

// Static file serving for locally stored uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Serve frontend statically if hosted together in production
app.use(express.static(path.join(__dirname, '../../')));

// Database auto-connection middleware for serverless (Vercel) & persistent environments
app.use(async (req, res, next) => {
  if (req.path.startsWith('/api') && req.path !== '/api/health') {
    try {
      await connectDatabase();
    } catch (err) {
      console.error('[Database Middleware Error]', err);

      const rawUri = (process.env.MONGODB_URI || config.MONGODB_URI || '').trim();
      const isLocalhost = rawUri.includes('127.0.0.1') || rawUri.includes('localhost');
      const isVercel = Boolean(process.env.VERCEL) || process.env.NODE_ENV === 'production';

      let hint = 'Please check your MongoDB Atlas cluster and Network Access whitelist (0.0.0.0/0).';

      if (isLocalhost && isVercel) {
        hint = 'ACTION REQUIRED: MONGODB_URI environment variable is missing in your Vercel Project Settings! Vercel is attempting to connect to 127.0.0.1 (localhost) which does not exist in the cloud. Go to Vercel -> Settings -> Environment Variables, and add MONGODB_URI with your MongoDB Atlas connection string.';
      } else if (err.message && (err.message.includes('bad auth') || err.message.includes('Authentication failed'))) {
        hint = 'Authentication failed. Please verify your MongoDB Atlas username and password. If your password has special characters like @, #, or %, make sure they are URL-encoded (e.g. @ becomes %40).';
      } else if (err.message && (err.message.includes('selection timed out') || err.message.includes('ETIMEDOUT'))) {
        hint = 'Connection timed out. In MongoDB Atlas, navigate to Network Access -> click "Add IP Address" -> select "Allow Access from Anywhere" (0.0.0.0/0).';
      }

      return res.status(500).json({
        success: false,
        message: 'Database connection error',
        error: err.message,
        hint,
        environment: config.NODE_ENV,
        isVercel: Boolean(process.env.VERCEL),
        timestamp: new Date().toISOString(),
      });
    }
  }
  next();
});

// Comprehensive Health & Database Diagnostic Check
app.get('/api/health', async (req, res) => {
  let dbStatus = 'disconnected';
  let dbError = null;
  const rawUri = (process.env.MONGODB_URI || config.MONGODB_URI || '').trim();
  const isCloudUri = rawUri.startsWith('mongodb+srv://') || (!rawUri.includes('127.0.0.1') && !rawUri.includes('localhost'));

  try {
    const conn = await connectDatabase();
    if (conn && conn.readyState === 1) {
      dbStatus = 'connected';
    }
  } catch (err) {
    dbStatus = 'failed';
    dbError = err.message;
  }

  res.json({
    status: dbStatus === 'connected' ? 'ok' : 'degraded',
    service: 'Chapter 23 API',
    database: {
      status: dbStatus,
      error: dbError,
      isConfigured: Boolean(process.env.MONGODB_URI),
      isCloudUri,
      hint: dbStatus === 'connected'
        ? 'MongoDB is connected and operational.'
        : (!process.env.MONGODB_URI
            ? 'Missing MONGODB_URI in Vercel. Go to Vercel Settings -> Environment Variables and add MONGODB_URI.'
            : 'Check MongoDB Atlas Network Access: Ensure 0.0.0.0/0 is whitelisted and password credentials are correct.'),
    },
    environment: config.NODE_ENV,
    isVercel: Boolean(process.env.VERCEL),
    timestamp: new Date().toISOString(),
  });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api', photoRoutes); // Direct routes like /api/orders/:id/photos
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

// Catch-all route for undefined API routes
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: 'API route not found' });
});

// Centralized Error Handler
app.use(errorHandler);

// Start Server & Connect Database
let server = null;

async function startServer(port = config.PORT) {
  try {
    await connectDatabase();
    await seedInitialAdmin();

    server = app.listen(port, () => {
      console.log(`\n======================================================`);
      console.log(` Chapter 23 — The Memory House (C23) Backend Live `);
      console.log(` Server running on: http://localhost:${port}`);
      console.log(` Health check:      http://localhost:${port}/api/health`);
      console.log(` Environment:       ${config.NODE_ENV}`);
      console.log(`======================================================\n`);
    });

    return server;
  } catch (err) {
    console.error('Failed to start Chapter 23 server:', err);
    process.exit(1);
  }
}

// Automatically start if run directly
if (require.main === module) {
  startServer();
}

app.startServer = startServer;
app.app = app;

module.exports = app;
