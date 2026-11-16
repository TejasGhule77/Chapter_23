const { error } = require('../utils/response');

function validateRegistration(req, res, next) {
  const { name, email, password, confirmPassword } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return error(res, 'Full name is required.', 400);
  }

  if (!email || typeof email !== 'string' || !email.trim()) {
    return error(res, 'Email address is required.', 400);
  }

  const emailRegex = /^\S+@\S+\.\S+$/;
  if (!emailRegex.test(email.trim())) {
    return error(res, 'Please provide a valid email address.', 400);
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    return error(res, 'Password must be at least 8 characters long.', 400);
  }

  if (confirmPassword !== undefined && password !== confirmPassword) {
    return error(res, 'Passwords do not match.', 400);
  }

  next();
}

function validateLogin(req, res, next) {
  const { email, password } = req.body;

  if (!email || !password) {
    return error(res, 'Email and password are required.', 400);
  }

  next();
}

module.exports = {
  validateRegistration,
  validateLogin,
};
