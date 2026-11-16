const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendEmail } = require('../config/mailer');

/**
 * Send an in-app notification and email to a user.
 */
async function notifyUser({
  userId,
  orderId = null,
  title,
  message,
  type = 'general',
  emailSubject = null,
  emailHtml = null,
}) {
  try {
    // 1. Save in-app notification to MongoDB
    const notification = await Notification.create({
      userId,
      orderId,
      title,
      message,
      type,
    });

    // 2. Lookup user to send email
    const user = await User.findById(userId).lean();
    if (user && user.email) {
      const subject = emailSubject || `Chapter 23 — ${title}`;
      const html = emailHtml || `
        <div style="font-family:'Georgia',serif;max-width:600px;margin:auto;padding:24px;background:#f5f2ec;color:#161616;border:1px solid #d2cdc4">
          <div style="border-bottom:1px solid #752b3d;padding-bottom:12px;margin-bottom:20px">
            <span style="font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#752b3d">Chapter 23 · The Memory House</span>
            <h2 style="margin:8px 0 0;font-size:26px;font-weight:normal">${title}</h2>
          </div>
          <p style="font-size:15px;line-height:1.7;color:#333">${message}</p>
          <div style="margin-top:30px;padding-top:16px;border-top:1px solid #d2cdc4;font-size:11px;color:#666">
            <p>Every life deserves an edition.</p>
            <p>© Chapter 23 — The Memory House</p>
          </div>
        </div>
      `;

      // Non-blocking email dispatch
      sendEmail({
        to: user.email,
        subject,
        html,
        text: message,
      }).catch((e) => console.error('[NotificationService] Email error:', e.message));
    }

    return notification;
  } catch (err) {
    console.error('[NotificationService] Notification error:', err.message);
    return null;
  }
}

module.exports = {
  notifyUser,
};
