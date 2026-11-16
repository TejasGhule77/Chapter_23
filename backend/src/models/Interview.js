const mongoose = require('mongoose');

const INTERVIEW_STATUSES = [
  'Pending',
  'Scheduled',
  'Reschedule Requested',
  'Completed',
  'Cancelled',
];

const interviewSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Interview must be linked to an order'],
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Interview must be linked to a customer'],
      index: true,
    },
    slotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InterviewSlot',
      default: null,
    },
    scheduledAt: {
      type: Date,
      default: null,
      index: true,
    },
    durationMinutes: {
      type: Number,
      default: 45,
    },
    platform: {
      type: String,
      enum: ['Google Meet', 'Zoom', 'Custom'],
      default: 'Google Meet',
    },
    meetingUrl: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: INTERVIEW_STATUSES,
      default: 'Pending',
      index: true,
    },
    rescheduleReason: {
      type: String,
      default: '',
      trim: true,
    },
    customerNotes: {
      type: String,
      default: '',
      trim: true,
    },
    adminNotes: {
      type: String,
      default: '',
      trim: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Interview = mongoose.model('Interview', interviewSchema);

module.exports = {
  Interview,
  INTERVIEW_STATUSES,
};
