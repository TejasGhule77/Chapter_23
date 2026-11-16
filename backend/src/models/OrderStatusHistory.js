const mongoose = require('mongoose');

const orderStatusHistorySchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    changedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    changedByRole: {
      type: String,
      default: 'admin',
    },
    previousStatus: {
      type: String,
      default: '',
    },
    newStatus: {
      type: String,
      default: '',
    },
    previousPaymentStatus: {
      type: String,
      default: '',
    },
    newPaymentStatus: {
      type: String,
      default: '',
    },
    note: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

orderStatusHistorySchema.index({ orderId: 1, createdAt: -1 });

const OrderStatusHistory = mongoose.model('OrderStatusHistory', orderStatusHistorySchema);
module.exports = OrderStatusHistory;
