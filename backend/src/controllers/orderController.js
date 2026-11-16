const { Order, ORDER_STATUSES, PAYMENT_STATUSES } = require('../models/Order');
const { Interview } = require('../models/Interview');
const OrderStatusHistory = require('../models/OrderStatusHistory');
const { notifyUser } = require('../services/notificationService');
const { success, error } = require('../utils/response');

/**
 * Customer creates an order request
 */
async function createOrder(req, res, next) {
  try {
    const { customerName, occasion, edition, notes } = req.body;

    if (!occasion || !edition) {
      return error(res, 'Occasion and edition are required fields.', 400);
    }

    const name = (customerName && customerName.trim()) || req.user.name;

    const order = new Order({
      userId: req.user.id,
      customerName: name,
      customerEmail: req.user.email,
      occasion: occasion.trim(),
      edition: edition.trim(),
      notes: (notes || '').trim(),
      status: 'Requested',
      paymentStatus: 'Pending',
    });

    await order.save();

    // Record initial status history
    await OrderStatusHistory.create({
      orderId: order._id,
      changedByUserId: req.user.id,
      changedByRole: 'customer',
      newStatus: 'Requested',
      newPaymentStatus: 'Pending',
      note: 'Order request submitted by customer.',
    });

    // Notify customer
    await notifyUser({
      userId: req.user.id,
      orderId: order._id,
      title: 'Order Request Received',
      message: `Your request for the "${order.edition}" edition has been received. Our editorial team will review your order details.`,
      type: 'order_received',
    });

    return success(res, order, 'Order request submitted successfully.', 201);
  } catch (err) {
    next(err);
  }
}

/**
 * Customer fetches their orders
 */
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

/**
 * Get single order details (ownership protected)
 */
async function getOrderById(req, res, next) {
  try {
    const order = await Order.findById(req.params.id)
      .populate('interviewId')
      .lean();

    if (!order) {
      return error(res, 'Order not found.', 404);
    }

    // Security check: Only the owner or an admin can access this order
    if (req.user.role !== 'admin' && order.userId.toString() !== req.user.id) {
      return error(res, 'Access denied. You cannot view orders that do not belong to you.', 403);
    }

    return success(res, order);
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: Get all orders with optional filtering
 */
async function getAdminOrders(req, res, next) {
  try {
    const { status, paymentStatus, search } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (search) {
      filter.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { customerEmail: { $regex: search, $options: 'i' } },
        { edition: { $regex: search, $options: 'i' } },
        { occasion: { $regex: search, $options: 'i' } },
      ];
    }

    const orders = await Order.find(filter)
      .populate('interviewId')
      .sort({ createdAt: -1 })
      .lean();

    return success(res, orders);
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: Update order status
 */
async function updateOrderStatus(req, res, next) {
  try {
    const { status, internalNote } = req.body;

    if (!status || !ORDER_STATUSES.includes(status)) {
      return error(
        res,
        `Invalid status. Permitted values: ${ORDER_STATUSES.join(', ')}`,
        400
      );
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return error(res, 'Order not found.', 404);
    }

    const previousStatus = order.status;
    order.status = status;

    // Workflow Step 1: When order is Confirmed or set to Interview Pending, trigger Interview workflow
    if (status === 'Confirmed' || status === 'Interview Pending') {
      let interview = await Interview.findOne({ orderId: order._id });
      if (!interview) {
        interview = await Interview.create({
          orderId: order._id,
          userId: order.userId,
          status: 'Pending',
          platform: 'Google Meet',
        });
      }
      order.interviewId = interview._id;

      // Notify customer to schedule interview
      await notifyUser({
        userId: order.userId,
        orderId: order._id,
        title: 'Order Confirmed — Schedule Your Interview',
        message: `Your Chapter 23 order for "${order.edition}" has been confirmed! Please open your account to select a video interview slot.`,
        type: 'interview_invited',
      });
    }

    // Status notifications for other milestones
    if (status === 'Photos Pending') {
      await notifyUser({
        userId: order.userId,
        orderId: order._id,
        title: 'Photo & Memory Upload Requested',
        message: `Your video interview is complete! Please upload your memorable photographs and stories in your account.`,
        type: 'photos_requested',
      });
    } else if (status === 'In Production') {
      await notifyUser({
        userId: order.userId,
        orderId: order._id,
        title: 'Magazine Production Started',
        message: `Our design team has commenced editorial typesetting and layout for "${order.edition}".`,
        type: 'production_started',
      });
    } else if (status === 'Shipped') {
      await notifyUser({
        userId: order.userId,
        orderId: order._id,
        title: 'Your Edition Has Shipped',
        message: `Your bespoke printed magazine is on its way to you!`,
        type: 'magazine_shipped',
      });
    } else if (status === 'Completed') {
      await notifyUser({
        userId: order.userId,
        orderId: order._id,
        title: 'Order Completed',
        message: `Your Chapter 23 edition has been delivered. Thank you for preserving your memories with us.`,
        type: 'order_completed',
      });
    }

    await order.save();

    // Log status history
    await OrderStatusHistory.create({
      orderId: order._id,
      changedByUserId: req.user.id,
      changedByRole: 'admin',
      previousStatus,
      newStatus: status,
      note: internalNote || `Status changed from ${previousStatus} to ${status}`,
    });

    return success(res, order, `Order status updated to "${status}".`);
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: Update payment status
 */
async function updatePaymentStatus(req, res, next) {
  try {
    const { paymentStatus, internalNote } = req.body;

    if (!paymentStatus || !PAYMENT_STATUSES.includes(paymentStatus)) {
      return error(
        res,
        `Invalid payment status. Permitted values: ${PAYMENT_STATUSES.join(', ')}`,
        400
      );
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return error(res, 'Order not found.', 404);
    }

    const previousPaymentStatus = order.paymentStatus;
    order.paymentStatus = paymentStatus;
    await order.save();

    // Log history
    await OrderStatusHistory.create({
      orderId: order._id,
      changedByUserId: req.user.id,
      changedByRole: 'admin',
      previousPaymentStatus,
      newPaymentStatus: paymentStatus,
      note: internalNote || `Payment status changed to ${paymentStatus}`,
    });

    if (paymentStatus === 'Paid') {
      await notifyUser({
        userId: order.userId,
        orderId: order._id,
        title: 'Payment Confirmed',
        message: `Payment for your order "${order.edition}" has been verified and confirmed.`,
        type: 'payment_confirmed',
      });
    }

    return success(res, order, `Payment status updated to "${paymentStatus}".`);
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: Add internal notes to an order
 */
async function addInternalNotes(req, res, next) {
  try {
    const { internalNotes } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) {
      return error(res, 'Order not found.', 404);
    }

    order.internalNotes = internalNotes || '';
    await order.save();

    return success(res, order, 'Internal notes saved.');
  } catch (err) {
    next(err);
  }
}

/**
 * Get order status change history
 */
async function getOrderHistory(req, res, next) {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return error(res, 'Order not found.', 404);
    }

    if (req.user.role !== 'admin' && order.userId.toString() !== req.user.id) {
      return error(res, 'Access denied.', 403);
    }

    const history = await OrderStatusHistory.find({ orderId: req.params.id })
      .populate('changedByUserId', 'name email role')
      .sort({ createdAt: -1 })
      .lean();

    return success(res, history);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  getAdminOrders,
  updateOrderStatus,
  updatePaymentStatus,
  addInternalNotes,
  getOrderHistory,
};
