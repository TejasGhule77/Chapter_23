const nodemailer = require('nodemailer');
const config = require('./env');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  // Check if SMTP or user credentials are configured
  if (config.EMAIL_USER && config.EMAIL_PASS) {
    if (config.EMAIL_SERVICE) {
      transporter = nodemailer.createTransport({
        service: config.EMAIL_SERVICE,
        auth: {
          user: config.EMAIL_USER,
          pass: config.EMAIL_PASS,
        },
      });
    } else if (config.EMAIL_HOST) {
      transporter = nodemailer.createTransport({
        host: config.EMAIL_HOST,
        port: config.EMAIL_PORT,
        secure: config.EMAIL_SECURE,
        auth: {
          user: config.EMAIL_USER,
          pass: config.EMAIL_PASS,
        },
      });
    }
  }

  return transporter;
}

/**
 * Send an email notification.
 * @param {Object} options { to, subject, html, text }
 */
async function sendEmail({ to, subject, html, text }) {
  const mailClient = getTransporter();

  if (!mailClient) {
    console.log(`\n======================================================`);
    console.log(`[EMAIL NOTIFICATION DISPATCHED (Simulation/Log Mode)]`);
    console.log(`TO: ${to}`);
    console.log(`FROM: ${config.EMAIL_FROM}`);
    console.log(`SUBJECT: ${subject}`);
    console.log(`BODY:\n${text || html?.replace(/<[^>]+>/g, '')}`);
    console.log(`======================================================\n`);
    return { success: true, simulated: true };
  }

  try {
    const info = await mailClient.sendMail({
      from: config.EMAIL_FROM,
      to,
      subject,
      text: text || html?.replace(/<[^>]+>/g, ''),
      html,
    });
    console.log(`[Email] Message sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[Email Error] Failed to send email to ${to}:`, err.message);
    // Don't throw so notification creation doesn't break main flow
    return { success: false, error: err.message };
  }
}

module.exports = {
  sendEmail,
  getTransporter
};
