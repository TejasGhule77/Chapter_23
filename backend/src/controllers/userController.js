const User = require('../models/User');
const { Order } = require('../models/Order');
const { success, error } = require('../utils/response');

async function getProfile(req, res, next) {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) {
      return error(res, 'User not found.', 404);
    }
    return success(res, {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone || '',
      createdAt: user.createdAt,
    });
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const { name, phone } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return error(res, 'User not found.', 404);
    }

    if (name && typeof name === 'string') {
      user.name = name.trim();
    }
    if (phone !== undefined && typeof phone === 'string') {
      user.phone = phone.trim();
    }

    await user.save();

    return success(
      res,
      {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
      'Profile updated successfully.'
    );
  } catch (err) {
    next(err);
  }
}

async function getMyOrders(req, res, next) {
  try {
    const orders = await Order.find({ userId: req.user.id })
      .populate('interviewId')
      .sort({ createdAt: -1 })
      .lean();

    return success(res, orders);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProfile,
  updateProfile,
  getMyOrders,
};
