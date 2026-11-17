/**
 * Vercel Serverless Function Entry Point for Chapter 23 API
 */
const app = require('../backend/src/server');
const { seedInitialAdmin } = require('../backend/src/services/seedService');

let seeded = false;

module.exports = async (req, res) => {
  if (!seeded) {
    try {
      await seedInitialAdmin();
      seeded = true;
    } catch (err) {
      console.error('[Vercel Seed Error]', err.message);
    }
  }
  return app(req, res);
};
