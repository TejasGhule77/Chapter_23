const { connectDatabase, closeDatabase } = require('./config/database');
const { seedInitialAdmin } = require('./services/seedService');

async function run() {
  try {
    console.log('[Seed CLI] Connecting to MongoDB...');
    await connectDatabase();
    await seedInitialAdmin();
    console.log('[Seed CLI] Seeding completed.');
  } catch (err) {
    console.error('[Seed CLI] Seeding failed:', err);
  } finally {
    await closeDatabase();
    process.exit(0);
  }
}

run();
