const jwt = require('jsonwebtoken');
const config = require('../config/env');
const User = require('../models/User');
const LoginHistory = require('../models/LoginHistory');
const { notifyUser } = require('../services/notificationService');
const { success, error } = require('../utils/response');

function generateToken(user) {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
    },
    config.JWT_SECRET,
    {
      expiresIn: config.JWT_EXPIRES_IN,
    }
  );
}

function setAuthCookie(res, token) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: config.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: config.COOKIE_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
  });
}

/**
 * Register a new customer
 */
async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    const cleanEmail = email.toLowerCase().trim();

    // Check duplicate
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return error(res, 'An account with this email address already exists.', 409);
    }

    // Always create as 'customer' (public registration cannot create admin)
    const user = new User({
      name: name.trim(),
      email: cleanEmail,
      password,
      role: 'customer',
      lastLoginAt: new Date(),
    });

    await user.save();

    // Generate JWT and set cookie
    const token = generateToken(user);
    setAuthCookie(res, token);

    // Record login event
    await LoginHistory.create({
      userId: user._id,
      email: user.email,
      ipAddress: req.ip || req.connection.remoteAddress || '',
      userAgent: req.headers['user-agent'] || '',
    });

    // Send welcome notification
    await notifyUser({
      userId: user._id,
      title: 'Welcome to Chapter 23',
      message: `Welcome, ${user.name}. Your archive is ready. Choose an edition to begin your personalized memory book.`,
      type: 'registration',
    });

    return success(
      res,
      {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token,
      },
      'Account created successfully.',
      201
    );
  } catch (err) {
    next(err);
  }
}

/**
 * Login customer or admin
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const cleanEmail = (email || '').toLowerCase().trim();

    // Explicitly select password field
    const user = await User.findOne({ email: cleanEmail }).select('+password');
    if (!user) {
      return error(res, 'Invalid email or password.', 401);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return error(res, 'Invalid email or password.', 401);
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = generateToken(user);
    setAuthCookie(res, token);

    // Record login event
    await LoginHistory.create({
      userId: user._id,
      email: user.email,
      ipAddress: req.ip || req.connection.remoteAddress || '',
      userAgent: req.headers['user-agent'] || '',
    });

    return success(
      res,
      {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token,
      },
      'Signed in successfully.'
    );
  } catch (err) {
    next(err);
  }
}

/**
 * Logout
 */
async function logout(req, res) {
  res.clearCookie('token', {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: config.NODE_ENV === 'production' ? 'none' : 'lax',
  });
  return success(res, null, 'Signed out successfully.');
}

/**
 * Get current authenticated user profile
 */
async function getMe(req, res) {
  return success(res, {
    user: req.user,
  });
}

module.exports = {
  register,
  login,
  logout,
  getMe,
};
