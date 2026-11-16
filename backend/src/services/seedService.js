const User = require('../models/User');
const config = require('../config/env');

/**
 * Ensures the initial admin user is seeded in MongoDB
 */
async function seedInitialAdmin() {
  try {
    const adminEmail = (config.INITIAL_ADMIN_EMAIL || 'prachimohite1711@gmail.com').toLowerCase().trim();
    const adminPassword = config.INITIAL_ADMIN_PASSWORD || 'Prachimohite@2309';
    const adminName = config.INITIAL_ADMIN_NAME || 'Prachi Mohite';

    let admin = await User.findOne({ email: adminEmail }).select('+password');

    if (!admin) {
      admin = new User({
        name: adminName,
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
      });
      await admin.save();
      console.log(`[Seed] Initial admin created successfully: ${adminEmail} (Role: admin)`);
    } else {
      // Ensure role is admin
      let needsSave = false;
      if (admin.role !== 'admin') {
        admin.role = 'admin';
        needsSave = true;
      }
      
      // Update password if needed to ensure the requested credentials work
      const matches = await admin.comparePassword(adminPassword);
      if (!matches) {
        admin.password = adminPassword; // pre('save') hook will hash it
        needsSave = true;
      }

      if (needsSave) {
        await admin.save();
        console.log(`[Seed] Admin updated to role: 'admin' and verified password: ${adminEmail}`);
      } else {
        console.log(`[Seed] Admin account verified: ${adminEmail}`);
      }
    }
  } catch (err) {
    console.error('[Seed] Error seeding initial admin:', err.message);
  }
}

module.exports = {
  seedInitialAdmin,
};
