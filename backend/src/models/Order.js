const mongoose = require('mongoose');

const ORDER_STATUSES = [
  'Requested',
  'Under Review',
  'Confirmed',
  'Interview Pending',
  'Interview Scheduled',
  'Interview Completed',
  'Photos Pending',
  'Photos Received',
  'In Production',
  'Shipped',
  'Completed',
  'Cancelled',
];

const PAYMENT_STATUSES = [
  'Pending',
  'Awaiting Verification',
  'Paid',
  'Refunded',
];

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Order must belong to a user'],
      index: true,
    },
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      maxlength: 100,
    },
    customerEmail: {
      type: String,
      required: [true, 'Customer email is required'],
      lowercase: true,
      trim: true,
      index: true,
    },
    occasion: {
      type: String,
      required: [true, 'Occasion is required'],
      trim: true,
      maxlength: 120,
    },
    edition: {
      type: String,
      required: [true, 'Edition or collection is required'],
      trim: true,
      maxlength: 160,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
      maxlength: 4000,
    },
    internalNotes: {
      type: String,
      default: '',
      trim: true,
      maxlength: 5000,
    },
    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: 'Requested',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: 'Pending',
      index: true,
    },
    interviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Interview',
      default: null,
    },
    photosCount: {
      type: Number,
      default: 0,
    },
    approvedPhotosCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Composite indexes for common queries
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

const Order = mongoose.model('Order', orderSchema);

module.exports = {
  Order,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
};
