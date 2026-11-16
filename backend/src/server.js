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

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Chapter 23 API',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
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

module.exports = { app, startServer };
