const { error } = require('../utils/response');

/**
 * Middleware to restrict access strictly to admin role
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return error(res, 'Access denied. Administrator privileges required.', 403);
  }
  next();
}

module.exports = requireAdmin;
