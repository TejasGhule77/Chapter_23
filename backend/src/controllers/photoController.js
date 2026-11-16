const { Photo, PHOTO_STATUSES } = require('../models/Photo');
const { Order } = require('../models/Order');
const OrderStatusHistory = require('../models/OrderStatusHistory');
const { uploadPhotoFile, deletePhotoFile } = require('../config/storage');
const { notifyUser } = require('../services/notificationService');
const { success, error } = require('../utils/response');

/**
 * Customer uploads photos and memory details for an order
 */
async function uploadPhotos(req, res, next) {
  try {
    const { id: orderId } = req.params;
    const order = await Order.findById(orderId);

    if (!order) {
      return error(res, 'Order not found.', 404);
    }

    if (order.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return error(res, 'Access denied. You can only upload photos for your own order.', 403);
    }

    if (!req.files || req.files.length === 0) {
      return error(res, 'No image files uploaded.', 400);
    }

    // Metadata may be passed as JSON string in body.metadata or array
    let metadataList = [];
    if (req.body.metadata) {
      try {
        metadataList = typeof req.body.metadata === 'string'
          ? JSON.parse(req.body.metadata)
          : req.body.metadata;
      } catch (e) {
        metadataList = [];
      }
    }

    const uploadedDocs = [];

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const meta = metadataList[i] || {};

      // Upload file to Cloudinary or local storage
      const uploadRes = await uploadPhotoFile(file, `chapter23/orders/${orderId}`);

      const photo = new Photo({
        orderId: order._id,
        userId: req.user.id,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: uploadRes.bytes || file.size,
        url: uploadRes.url,
        publicId: uploadRes.publicId,
        storageType: uploadRes.storageType,
        caption: meta.caption || req.body.caption || '',
        peopleShown: meta.peopleShown || req.body.peopleShown || '',
        yearDate: meta.yearDate || req.body.yearDate || '',
        memoryDescription: meta.memoryDescription || req.body.memoryDescription || '',
        storyNotes: meta.storyNotes || req.body.storyNotes || '',
        status: 'Submitted',
      });

      await photo.save();
      uploadedDocs.push(photo);
    }

    // Update order photo count
    const totalPhotos = await Photo.countDocuments({ orderId: order._id });
    order.photosCount = totalPhotos;
    await order.save();

    return success(
      res,
      uploadedDocs,
      `${uploadedDocs.length} photo(s) and memories uploaded successfully.`,
      201
    );
  } catch (err) {
    next(err);
  }
}

/**
 * Get photos for an order (owner or admin only)
 */
async function getOrderPhotos(req, res, next) {
  try {
    const { id: orderId } = req.params;
    const order = await Order.findById(orderId);

    if (!order) {
      return error(res, 'Order not found.', 404);
    }

    if (order.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return error(res, 'Access denied.', 403);
    }

    const photos = await Photo.find({ orderId }).sort({ createdAt: 1 }).lean();

    return success(res, photos);
  } catch (err) {
    next(err);
  }
}

/**
 * Customer deletes a photo before approval
 */
async function deletePhoto(req, res, next) {
  try {
    const { id } = req.params;
    const photo = await Photo.findById(id);

    if (!photo) {
      return error(res, 'Photo not found.', 404);
    }

    if (photo.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return error(res, 'Access denied.', 403);
    }

    // Delete from storage
    await deletePhotoFile(photo.publicId, photo.storageType);

    const orderId = photo.orderId;
    await Photo.findByIdAndDelete(id);

    // Update photo count
    const totalPhotos = await Photo.countDocuments({ orderId });
    await Order.findByIdAndUpdate(orderId, { photosCount: totalPhotos });

    return success(res, null, 'Photo removed successfully.');
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: Update individual photo status and feedback
 */
async function updatePhotoStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, adminFeedback } = req.body;

    if (!status || !PHOTO_STATUSES.includes(status)) {
      return error(res, `Invalid status. Permitted: ${PHOTO_STATUSES.join(', ')}`, 400);
    }

    const photo = await Photo.findById(id);
    if (!photo) {
      return error(res, 'Photo not found.', 404);
    }

    photo.status = status;
    if (adminFeedback !== undefined) photo.adminFeedback = adminFeedback.trim();
    await photo.save();

    // Recalculate approved count
    const approvedCount = await Photo.countDocuments({
      orderId: photo.orderId,
      status: 'Approved',
    });
    await Order.findByIdAndUpdate(photo.orderId, { approvedPhotosCount: approvedCount });

    // Notify customer if replacement requested
    if (status === 'Replacement Requested') {
      await notifyUser({
        userId: photo.userId,
        orderId: photo.orderId,
        title: 'Photo Replacement Requested',
        message: `Our editorial team reviewed your photo "${photo.originalName}" and requested a replacement: ${photo.adminFeedback || 'Please provide a higher resolution or alternative image.'}`,
        type: 'photos_additional_requested',
      });
    }

    return success(res, photo, `Photo status updated to ${status}.`);
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: Request additional photographs from customer
 */
async function requestAdditionalPhotos(req, res, next) {
  try {
    const { id: orderId } = req.params;
    const { message } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return error(res, 'Order not found.', 404);
    }

    const instructions = message || 'Our creative team needs a few additional high-resolution images to complete your magazine layout.';

    await notifyUser({
      userId: order.userId,
      orderId: order._id,
      title: 'Additional Photographs Requested',
      message: instructions,
      type: 'photos_additional_requested',
    });

    return success(res, null, 'Additional photos requested from customer.');
  } catch (err) {
    next(err);
  }
}

/**
 * Admin: Mark photo collection as received -> updates order status to 'Photos Received'
 */
async function markCollectionReceived(req, res, next) {
  try {
    const { id: orderId } = req.params;
    const order = await Order.findById(orderId);

    if (!order) {
      return error(res, 'Order not found.', 404);
    }

    const prevStatus = order.status;
    order.status = 'Photos Received';
    await order.save();

    // Log history
    await OrderStatusHistory.create({
      orderId: order._id,
      changedByUserId: req.user.id,
      changedByRole: 'admin',
      previousStatus: prevStatus,
      newStatus: 'Photos Received',
      note: 'Admin confirmed complete photo and memory collection received.',
    });

    await notifyUser({
      userId: order.userId,
      orderId: order._id,
      title: 'Photo Collection Received',
      message: `We have received and approved your submitted photographs and stories for "${order.edition}". Layout curation will begin soon.`,
      type: 'photos_approved',
    });

    return success(res, order, 'Photo collection marked as received.');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  uploadPhotos,
  getOrderPhotos,
  deletePhoto,
  updatePhotoStatus,
  requestAdditionalPhotos,
  markCollectionReceived,
};
