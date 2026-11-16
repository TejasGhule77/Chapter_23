const jwt = require('jsonwebtoken');
const config = require('../config/env');
const User = require('../models/User');
const { error } = require('../utils/response');

/**
 * Middleware to authenticate requests via JWT cookie or Authorization Bearer header
 */
async function authenticate(req, res, next) {
  try {
    let token = null;

    // 1. Check HTTP-only cookie
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    // 2. Check Authorization Bearer header
    else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return error(res, 'Authentication required. Please sign in.', 401);
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, config.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return error(res, 'Session expired. Please sign in again.', 401);
      }
      return error(res, 'Invalid authentication token.', 401);
    }

    // Fetch user from DB
    const user = await User.findById(decoded.id).select('+role');
    if (!user) {
      return error(res, 'Account no longer exists.', 401);
    }

    req.user = {
      id: user._id.toString(),
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (err) {
    console.error('[Auth Middleware] Error:', err);
    return error(res, 'Authentication failed.', 500);
  }
}

module.exports = authenticate;
