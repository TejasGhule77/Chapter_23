const { Interview, INTERVIEW_STATUSES } = require('../models/Interview');
const InterviewSlot = require('../models/InterviewSlot');
const InterviewNote = require('../models/InterviewNote');
const { Order } = require('../models/Order');
const OrderStatusHistory = require('../models/OrderStatusHistory');
const { notifyUser } = require('../services/notificationService');
const { success, error } = require('../utils/response');

/**
 * Get available unbooked interview slots
 */
async function getAvailableSlots(req, res, next) {
  try {
    const slots = await InterviewSlot.find({
      isBooked: false,
      startTime: { $gte: new Date(Date.now() - 5 * 60 * 1000) }, // allow slots starting now or future
    })
      .sort({ startTime: 1 })
      .lean();

    return success(res, slots);
  } catch (err) {
    next(err);
  }
}

/**
 * Customer books an interview slot for their order
 */
async function bookSlot(req, res, next) {
  try {
    const { slotId, orderId, notes } = req.body;

    if (!slotId || !orderId) {
      return error(res, 'Slot ID and Order ID are required.', 400);
    }

    // Verify order ownership
    const order = await Order.findById(orderId);
    if (!order) {
      return error(res, 'Order not found.', 404);
    }
    if (order.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return error(res, 'Access denied. Order does not belong to you.', 403);
    }

    // Atomic slot booking to prevent double-booking
    const slot = await InterviewSlot.findOneAndUpdate(
      { _id: slotId, isBooked: false },
      {
        isBooked: true,
        bookedByUserId: req.user.id,
        bookedForOrderId: order._id,
      },
      { new: true }
    );

    if (!slot) {
      return error(
        res,
        'This interview slot is no longer available. Please select another time slot.',
        409
      );
    }

    // Upsert or update Interview record
    let interview = await Interview.findOne({ orderId: order._id });
    if (!interview) {
      interview = new Interview({
        orderId: order._id,
        userId: req.user.id,
      });
    }

    interview.slotId = slot._id;
    interview.scheduledAt = slot.startTime;
    interview.durationMinutes = slot.durationMinutes;
    interview.platform = slot.platform;
    interview.meetingUrl = slot.meetingUrl;
    interview.status = 'Scheduled';
    interview.customerNotes = notes || '';
    await interview.save();

    // Link interview and update order status
    order.interviewId = interview._id;
    const prevStatus = order.status;
    order.status = 'Interview Scheduled';
    await order.save();

    // Log history
    await OrderStatusHistory.create({
      orderId: order._id,
      changedByUserId: req.user.id,
      changedByRole: 'customer',
      previousStatus: prevStatus,
      newStatus: 'Interview Scheduled',
      note: `Customer booked interview for ${new Date(slot.startTime).toLocaleString()}`,
    });

    // Notify customer with meeting details
    const formattedDate = new Date(slot.startTime).toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'short',
    });

    await notifyUser({
      userId: req.user.id,
      orderId: order._id,
      title: 'Interview Scheduled',
      message: `Your video interview for "${order.edition}" has been confirmed for ${formattedDate} via ${slot.platform}. Access your meeting link in your account dashboard.`,
      type: 'interview_scheduled',
    });

    return success(
      res,
      { interview, slot },
      'Interview slot booked successfully.'
    );
  } catch (err) {
    next(err);
  }
}

/**
 * Customer fetches their interviews
 */
async function getMyInterviews(req, res, next) {
  try {
    const interviews = await Interview.find({ userId: req.user.id })
      .populate('orderId', 'edition occasion status customerName')
      .populate('slotId')
      .sort({ scheduledAt: 1 })
      .lean();

    return success(res, interviews);
  } catch (err) {
    next(err);
  }
}

/**
 * Customer requests to reschedule an interview
 */
async function requestReschedule(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const interview = await Interview.findById(id);
    if (!interview) {
      return error(res, 'Interview not found.', 404);
    }

    if (interview.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return error(res, 'Access denied.', 403);
    }

    // Release old slot if booked
    if (interview.slotId) {
      await InterviewSlot.findByIdAndUpdate(interview.slotId, {
        isBooked: false,
        bookedByUserId: null,
        bookedForOrderId: null,
      });
    }

    interview.status = 'Reschedule Requested';
    interview.rescheduleReason = reason || 'Customer requested a different time';
    await interview.save();

    // Update order status
    await Order.findByIdAndUpdate(interview.orderId, {
      status: 'Interview Pending',
    });

    await notifyUser({
      userId: interview.userId,
      orderId: interview.orderId,
      title: 'Reschedule Request Received',
      message: 'Your reschedule request has been received. Please select a new interview slot when available.',
      type: 'interview_rescheduled',
    });

    return success(res, interview, 'Reschedule request submitted.');
  } catch (err) {
    next(err);
  }
}

// ------------------- ADMIN CONTROLLERS ------------------- //

/**
 * Admin: Create an available interview slot
 */
async function createSlot(req, res, next) {
  try {
    const { startTime, endTime, durationMinutes, platform, meetingUrl } = req.body;

    if (!startTime) {
      return error(res, 'Start time is required.', 400);
    }

    const start = new Date(startTime);
    const duration = parseInt(durationMinutes, 10) || 45;
    const end = endTime ? new Date(endTime) : new Date(start.getTime() + duration * 60 * 1000);

    const slot = await InterviewSlot.create({
      startTime: start,
      endTime: end,
      durationMinutes: duration,
      platform: platform || 'Google Meet',
      meetingUrl: (meetingUrl || '').trim(),
      createdByAdminId: req.user.id,
    });

    return success(res, slot, 'Interview slot created.', 201);
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: Get all slots (booked and available)
 */
async function getAllSlots(req, res, next) {
  try {
    const slots = await InterviewSlot.find()
      .populate('bookedByUserId', 'name email')
      .populate('bookedForOrderId', 'edition customerName')
      .sort({ startTime: 1 })
      .lean();

    return success(res, slots);
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: Delete an unbooked slot
 */
async function deleteSlot(req, res, next) {
  try {
    const slot = await InterviewSlot.findById(req.params.id);
    if (!slot) {
      return error(res, 'Slot not found.', 404);
    }

    if (slot.isBooked) {
      return error(res, 'Cannot delete an already booked slot.', 400);
    }

    await InterviewSlot.findByIdAndDelete(req.params.id);
    return success(res, null, 'Slot removed successfully.');
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: Update interview status and meeting link
 */
async function updateInterview(req, res, next) {
  try {
    const { status, platform, meetingUrl, adminNotes, scheduledAt } = req.body;

    const interview = await Interview.findById(req.params.id);
    if (!interview) {
      return error(res, 'Interview not found.', 404);
    }

    if (status && INTERVIEW_STATUSES.includes(status)) {
      interview.status = status;
    }
    if (platform) interview.platform = platform;
    if (meetingUrl !== undefined) interview.meetingUrl = meetingUrl.trim();
    if (adminNotes !== undefined) interview.adminNotes = adminNotes;
    if (scheduledAt) interview.scheduledAt = new Date(scheduledAt);

    // If marked Completed
    if (status === 'Completed') {
      interview.completedAt = new Date();
      // Automatically advance Order status to 'Photos Pending'
      const order = await Order.findById(interview.orderId);
      if (order) {
        const prevStatus = order.status;
        order.status = 'Photos Pending';
        await order.save();

        await OrderStatusHistory.create({
          orderId: order._id,
          changedByUserId: req.user.id,
          changedByRole: 'admin',
          previousStatus: prevStatus,
          newStatus: 'Photos Pending',
          note: 'Interview completed. Customer requested to upload photographs and memories.',
        });

        // Notify customer
        await notifyUser({
          userId: order.userId,
          orderId: order._id,
          title: 'Interview Completed — Photo Upload Requested',
          message: `Thank you for sharing your story during our interview! Please log in to your Chapter 23 account to upload the photographs and memories for your magazine.`,
          type: 'photos_requested',
        });
      }
    }

    await interview.save();

    return success(res, interview, 'Interview updated successfully.');
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: Get interview questionnaire notes
 */
async function getInterviewNotes(req, res, next) {
  try {
    const { id } = req.params; // orderId or interviewId
    const notes = await InterviewNote.findOne({
      $or: [{ orderId: id }, { interviewId: id }],
    }).populate('savedByAdminId', 'name email').lean();

    return success(res, notes || null);
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: Save interview questionnaire notes for story collection
 */
async function saveInterviewNotes(req, res, next) {
  try {
    const { orderId, interviewId, answers } = req.body;

    if (!orderId) {
      return error(res, 'Order ID is required.', 400);
    }

    let notes = await InterviewNote.findOne({ orderId });

    if (!notes) {
      notes = new InterviewNote({
        orderId,
        interviewId: interviewId || null,
        savedByAdminId: req.user.id,
        answers: answers || {},
      });
    } else {
      notes.savedByAdminId = req.user.id;
      notes.answers = { ...notes.answers, ...answers };
      if (interviewId) notes.interviewId = interviewId;
    }

    await notes.save();

    return success(res, notes, 'Interview questionnaire notes saved.');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAvailableSlots,
  bookSlot,
  getMyInterviews,
  requestReschedule,
  createSlot,
  getAllSlots,
  deleteSlot,
  updateInterview,
  getInterviewNotes,
  saveInterviewNotes,
};
