const express = require('express');
const router = express.Router();
const photoController = require('../controllers/photoController');
const authenticate = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const upload = require('../middleware/upload');

router.use(authenticate);

// Customer photo endpoints (supports both /orders/:id/photos and /:id/photos)
router.post('/orders/:id/photos', upload.array('photos', 20), photoController.uploadPhotos);
router.get('/orders/:id/photos', photoController.getOrderPhotos);
router.post('/:id/photos', upload.array('photos', 20), photoController.uploadPhotos);
router.get('/:id/photos', photoController.getOrderPhotos);

router.delete('/photos/:id', photoController.deletePhoto);
router.delete('/:id', photoController.deletePhoto);

// Admin photo endpoints
router.patch('/admin/photos/:id/status', requireAdmin, photoController.updatePhotoStatus);
router.patch('/admin/:id/status', requireAdmin, photoController.updatePhotoStatus);
router.post('/admin/orders/:id/request-photos', requireAdmin, photoController.requestAdditionalPhotos);
router.post('/admin/orders/:id/mark-photos-received', requireAdmin, photoController.markCollectionReceived);

module.exports = router;
