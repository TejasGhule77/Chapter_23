const mongoose = require('mongoose');

const interviewNoteSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      unique: true,
      index: true,
    },
    interviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Interview',
      default: null,
    },
    savedByAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    answers: {
      occasion: {
        type: String,
        default: '',
        trim: true,
      },
      occasionSpecial: {
        type: String,
        default: '',
        trim: true,
      },
      keyPeople: {
        type: String,
        default: '',
        trim: true,
      },
      memorableMoments: {
        type: String,
        default: '',
        trim: true,
      },
      emotions: {
        type: String,
        default: '',
        trim: true,
      },
      memoriesNeverForget: {
        type: String,
        default: '',
        trim: true,
      },
      milestones: {
        type: String,
        default: '',
        trim: true,
      },
      finalMessage: {
        type: String,
        default: '',
        trim: true,
      },
      additionalNotes: {
        type: String,
        default: '',
        trim: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

const InterviewNote = mongoose.model('InterviewNote', interviewNoteSchema);
module.exports = InterviewNote;
