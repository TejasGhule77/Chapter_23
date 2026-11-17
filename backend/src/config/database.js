const mongoose = require('mongoose');
const config = require('./env');

// Global cache for serverless environments (e.g. Vercel)
let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDatabase(uriOverride) {
  const uri = uriOverride || config.MONGODB_URI;

  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000,
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
    console.error('[Database] Failed to connect to MongoDB:', error.message);
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
  mongoose,
};
