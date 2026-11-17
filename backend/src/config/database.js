const mongoose = require('mongoose');
const config = require('./env');

// Global cache for serverless environments (e.g. Vercel)
let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

function getSanitizedUri(uriOverride) {
  let rawUri = (uriOverride || process.env.MONGODB_URI || config.MONGODB_URI || '').trim();

  // Strip wrapping double or single quotes if accidentally pasted
  if (
    (rawUri.startsWith('"') && rawUri.endsWith('"')) ||
    (rawUri.startsWith("'") && rawUri.endsWith("'"))
  ) {
    rawUri = rawUri.slice(1, -1).trim();
  }

  // If in production / Vercel and URI is localhost or missing
  const isVercel = Boolean(process.env.VERCEL);
  const isProduction = process.env.NODE_ENV === 'production';
  const isLocalhost = rawUri.includes('127.0.0.1') || rawUri.includes('localhost');

  if ((isVercel || isProduction) && (!rawUri || isLocalhost)) {
    console.error('\n[CRITICAL CONFIGURATION ERROR]');
    console.error('The MONGODB_URI environment variable is missing or set to localhost on Vercel.');
    console.error('Vercel serverless functions cannot connect to 127.0.0.1.');
    console.error('Please add your MongoDB Atlas connection string to Vercel Project Settings > Environment Variables.\n');
  }

  return rawUri;
}

async function connectDatabase(uriOverride) {
  const uri = getSanitizedUri(uriOverride);

  if (!uri) {
    throw new Error('MONGODB_URI is not defined. Please set MONGODB_URI in your environment variables.');
  }

  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      autoIndex: true,
      serverSelectionTimeoutMS: 15000, // 15 seconds for Atlas cloud connections
      connectTimeoutMS: 15000,
      maxPoolSize: 10,
    };

    cached.promise = mongoose.connect(uri, opts).then((m) => {
      console.log(`[Database] MongoDB Connected successfully to: ${m.connection.host}/${m.connection.name}`);
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    console.error('[Database] Connection failure:', error.message);
    throw error;
  }

  return cached.conn;
}

async function closeDatabase() {
  if (cached.conn) {
    await mongoose.connection.close();
    cached.conn = null;
    cached.promise = null;
    console.log('[Database] MongoDB connection closed.');
  }
}

module.exports = {
  connectDatabase,
  closeDatabase,
  getSanitizedUri,
  mongoose,
};
