const { error } = require('../utils/response');

function errorHandler(err, req, res, next) {
  console.error('[Error Handler]', err);

  // File validation errors
  if (err.message && (err.message.includes('Invalid file type') || err.message.includes('Only JPEG'))) {
    return error(res, err.message, 400);
  }

  // Multer error handling
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return error(res, 'File too large. Maximum file size is 15MB.', 400);
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return error(res, 'Too many files uploaded at once. Maximum is 20 files.', 400);
    }
    return error(res, `Upload error: ${err.message}`, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((val) => val.message);
    return error(res, messages.join('. '), 400);
  }

  // MongoDB duplicate key error (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return error(res, `An account with that ${field} already exists.`, 409);
  }

  // Custom client error with status code
  const statusCode = err.statusCode || 500;
  const message = err.message || 'An unexpected server error occurred.';

  return error(res, message, statusCode);
}

module.exports = errorHandler;
