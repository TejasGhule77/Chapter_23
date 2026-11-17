/**
 * Vercel Serverless Function Entry Point for Chapter 23 API
 */
const app = require('../backend/src/server');
const { connectDatabase } = require('../backend/src/config/database');
const { seedInitialAdmin } = require('../backend/src/services/seedService');

let seeded = false;

module.exports = async (req, res) => {
  try {
    await connectDatabase();
    if (!seeded) {
      await seedInitialAdmin();
      seeded = true;
    }
  } catch (err) {
    console.error('[Vercel Database/Seed Error]', err.message);
  }
  return app(req, res);
};
