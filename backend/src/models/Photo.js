const mongoose = require('mongoose');

const PHOTO_STATUSES = ['Submitted', 'Approved', 'Replacement Requested'];

const photoSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Photo must be associated with an order'],
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Photo must belong to a user'],
      index: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    publicId: {
      type: String,
      required: true,
    },
    storageType: {
      type: String,
      enum: ['cloudinary', 'local'],
      default: 'local',
    },
    caption: {
      type: String,
      default: '',
      trim: true,
      maxlength: 300,
    },
    peopleShown: {
      type: String,
      default: '',
      trim: true,
      maxlength: 300,
    },
    yearDate: {
      type: String,
      default: '',
      trim: true,
      maxlength: 100,
    },
    memoryDescription: {
      type: String,
      default: '',
      trim: true,
      maxlength: 2000,
    },
    storyNotes: {
      type: String,
      default: '',
      trim: true,
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: PHOTO_STATUSES,
      default: 'Submitted',
      index: true,
    },
    adminFeedback: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

photoSchema.index({ orderId: 1, status: 1 });

const Photo = mongoose.model('Photo', photoSchema);

module.exports = {
  Photo,
  PHOTO_STATUSES,
};
