const mongoose = require('mongoose');
const config = require('./env');

let isConnected = false;

async function connectDatabase(uriOverride) {
  const uri = uriOverride || config.MONGODB_URI;

  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    const conn = await mongoose.connect(uri, {
      autoIndex: true, // Build indexes automatically in production / dev
      serverSelectionTimeoutMS: 5000,
    });

    isConnected = true;
    console.log(`[Database] MongoDB Connected successfully to: ${conn.connection.host}/${conn.connection.name}`);

    mongoose.connection.on('error', (err) => {
      console.error('[Database] MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[Database] MongoDB disconnected. Attempting to reconnect...');
      isConnected = false;
    });

    return conn;
  } catch (error) {
    console.error('[Database] Failed to connect to MongoDB:', error.message);
    throw error;
  }
}

async function closeDatabase() {
  if (isConnected) {
    await mongoose.connection.close();
    isConnected = false;
    console.log('[Database] MongoDB connection closed.');
  }
}

module.exports = {
  connectDatabase,
  closeDatabase,
  mongoose
};
