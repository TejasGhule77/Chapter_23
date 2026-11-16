const path = require('path');
const dotenv = require('dotenv');

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '../../.env') });

const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  
  // MongoDB Connection URI
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/chapter23_db',
  
  // JWT Configuration
  JWT_SECRET: process.env.JWT_SECRET || 'chapter23_super_secret_jwt_key_2026_the_memory_house',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  COOKIE_EXPIRES_DAYS: parseInt(process.env.COOKIE_EXPIRES_DAYS, 10) || 7,
  
  // CORS Configuration
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
  
  // Default Admin Credentials
  INITIAL_ADMIN_EMAIL: process.env.INITIAL_ADMIN_EMAIL || 'prachimohite1711@gmail.com',
  INITIAL_ADMIN_PASSWORD: process.env.INITIAL_ADMIN_PASSWORD || 'Prachimohite@2309',
  INITIAL_ADMIN_NAME: process.env.INITIAL_ADMIN_NAME || 'Prachi Mohite (Admin)',

  // Email / Nodemailer Configuration (Optional, falls back to logging)
  EMAIL_SERVICE: process.env.EMAIL_SERVICE || '',
  EMAIL_HOST: process.env.EMAIL_HOST || '',
  EMAIL_PORT: parseInt(process.env.EMAIL_PORT, 10) || 587,
  EMAIL_SECURE: process.env.EMAIL_SECURE === 'true',
  EMAIL_USER: process.env.EMAIL_USER || '',
  EMAIL_PASS: process.env.EMAIL_PASS || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'Chapter 23 <no-reply@chapter23memoryhouse.com>',

  // Cloudinary Configuration (Optional, falls back to local disk storage)
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',

  // File Upload Configuration
  MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 15,
  UPLOAD_DIR: path.join(__dirname, '../../uploads')
};

module.exports = config;
