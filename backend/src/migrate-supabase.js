/**
 * Migration Utility: Supabase -> MongoDB
 * Reads exported Supabase data (JSON format) and imports into MongoDB.
 */
const fs = require('fs');
const path = require('path');
const { connectDatabase, closeDatabase } = require('./config/database');
const User = require('./models/User');
const { Order } = require('./models/Order');
const LoginHistory = require('./models/LoginHistory');

async function migrateFromExport(filePath) {
  try {
    await connectDatabase();

    const fullPath = path.resolve(filePath);
    if (!fs.existsSync(fullPath)) {
      console.log(`[Migration] No Supabase export file found at ${fullPath}. Skipping migration.`);
      return;
    }

    const raw = fs.readFileSync(fullPath, 'utf8');
    const data = JSON.parse(raw);

    console.log(`[Migration] Starting import from ${filePath}...`);

    const userMap = {}; // supabaseId -> mongoId

    // 1. Migrate users/profiles
    if (Array.isArray(data.profiles)) {
      for (const p of data.profiles) {
        let user = await User.findOne({ email: p.email?.toLowerCase().trim() });
        if (!user) {
          user = await User.create({
            name: p.name || p.email.split('@')[0],
            email: p.email.toLowerCase().trim(),
            password: 'TemporaryPassword@2026', // Customer must reset
            role: 'customer',
            createdAt: p.created_at ? new Date(p.created_at) : new Date(),
          });
          console.log(`[Migration] Created user: ${user.email}`);
        }
        if (p.id) userMap[p.id] = user._id;
      }
    }

    // 2. Migrate orders
    if (Array.isArray(data.orders)) {
      for (const o of data.orders) {
        const userId = userMap[o.user_id];
        if (!userId) {
          console.warn(`[Migration] Skipping order ${o.id}: user not found`);
          continue;
        }

        const exists = await Order.findOne({
          userId,
          occasion: o.occasion,
          edition: o.edition,
        });

        if (!exists) {
          const statusMap = {
            requested: 'Requested',
            confirmed: 'Confirmed',
            in_production: 'In Production',
            shipped: 'Shipped',
            completed: 'Completed',
            cancelled: 'Cancelled',
          };

          const paymentMap = {
            pending: 'Pending',
            paid: 'Paid',
            refunded: 'Refunded',
          };

          await Order.create({
            userId,
            customerName: o.customer_name || 'Valued Customer',
            customerEmail: o.customer_email || 'customer@example.com',
            occasion: o.occasion || 'Special Occasion',
            edition: o.edition || 'Custom Edition',
            notes: o.notes || '',
            status: statusMap[o.status] || 'Requested',
            paymentStatus: paymentMap[o.payment_status] || 'Pending',
            createdAt: o.created_at ? new Date(o.created_at) : new Date(),
          });
          console.log(`[Migration] Imported order: ${o.edition} for user ${userId}`);
        }
      }
    }

    console.log('[Migration] Migration completed successfully.');
  } catch (err) {
    console.error('[Migration] Migration error:', err.message);
  } finally {
    await closeDatabase();
  }
}

// Run CLI if argument provided
const exportArg = process.argv[2] || 'supabase-export.json';
migrateFromExport(exportArg);
