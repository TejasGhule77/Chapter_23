const User = require('../models/User');
const { Order } = require('../models/Order');
const { Interview } = require('../models/Interview');
const { Photo } = require('../models/Photo');
const LoginHistory = require('../models/LoginHistory');
const { success } = require('../utils/response');

/**
 * Admin Dashboard Overview Metrics
 */
async function getDashboardMetrics(req, res, next) {
  try {
    const [
      totalCustomers,
      totalOrders,
      newRequests,
      confirmedOrders,
      pendingPayments,
      upcomingInterviews,
      completedInterviews,
      pendingPhotos,
      inProduction,
      completedOrders,
      recentSignIns,
    ] = await Promise.all([
      User.countDocuments({ role: 'customer' }),
      Order.countDocuments(),
      Order.countDocuments({ status: 'Requested' }),
      Order.countDocuments({ status: { $in: ['Confirmed', 'Interview Pending', 'Interview Scheduled'] } }),
      Order.countDocuments({ paymentStatus: 'Pending' }),
      Interview.countDocuments({ status: 'Scheduled', scheduledAt: { $gte: new Date() } }),
      Interview.countDocuments({ status: 'Completed' }),
      Order.countDocuments({ status: 'Photos Pending' }),
      Order.countDocuments({ status: 'In Production' }),
      Order.countDocuments({ status: 'Completed' }),
      LoginHistory.find().sort({ createdAt: -1 }).limit(10).populate('userId', 'name email role').lean(),
    ]);

    return success(res, {
      metrics: {
        totalCustomers,
        totalOrders,
        newRequests,
        confirmedOrders,
        pendingPayments,
        upcomingInterviews,
        completedInterviews,
        pendingPhotos,
        inProduction,
        completedOrders,
      },
      recentSignIns,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: List & Search Registered Customers
 */
async function getCustomers(req, res, next) {
  try {
    const { search } = req.query;
    const filter = { role: 'customer' };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const customers = await User.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    // Fetch order counts and latest progress for each customer
    const enriched = await Promise.all(
      customers.map(async (c) => {
        const orderCount = await Order.countDocuments({ userId: c._id });
        const latestOrder = await Order.findOne({ userId: c._id })
          .sort({ createdAt: -1 })
          .select('edition occasion status paymentStatus createdAt')
          .lean();

        return {
          ...c,
          orderCount,
          latestOrder,
        };
      })
    );

    return success(res, enriched);
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: Detailed customer view (profile, orders, sign-ins, photos, interviews)
 */
async function getCustomerDetails(req, res, next) {
  try {
    const { id } = req.params;
    const customer = await User.findById(id).lean();

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    const [orders, signIns, interviews, photos] = await Promise.all([
      Order.find({ userId: id }).sort({ createdAt: -1 }).populate('interviewId').lean(),
      LoginHistory.find({ userId: id }).sort({ createdAt: -1 }).limit(20).lean(),
      Interview.find({ userId: id }).sort({ createdAt: -1 }).lean(),
      Photo.find({ userId: id }).sort({ createdAt: -1 }).lean(),
    ]);

    return success(res, {
      customer,
      orders,
      signIns,
      interviews,
      photos,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: List Recent Sign-in Events
 */
async function getLoginEvents(req, res, next) {
  try {
    const events = await LoginHistory.find()
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return success(res, events);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboardMetrics,
  getCustomers,
  getCustomerDetails,
  getLoginEvents,
};
