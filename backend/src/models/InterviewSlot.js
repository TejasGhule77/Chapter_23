const mongoose = require('mongoose');

const interviewSlotSchema = new mongoose.Schema(
  {
    startTime: {
      type: Date,
      required: [true, 'Slot start time is required'],
      index: true,
    },
    endTime: {
      type: Date,
      required: [true, 'Slot end time is required'],
    },
    durationMinutes: {
      type: Number,
      default: 45,
      min: 15,
      max: 180,
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
    isBooked: {
      type: Boolean,
      default: false,
      index: true,
    },
    bookedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    bookedForOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
      index: true,
    },
    createdByAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent overlapping bookings
interviewSlotSchema.index({ startTime: 1, isBooked: 1 });

const InterviewSlot = mongoose.model('InterviewSlot', interviewSlotSchema);
module.exports = InterviewSlot;
