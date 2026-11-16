const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authenticate = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');

router.use(authenticate);

// Customer endpoints
router.post('/', orderController.createOrder);
router.get('/my-orders', orderController.getMyOrders);
router.get('/:id', orderController.getOrderById);
router.get('/:id/history', orderController.getOrderHistory);

// Admin endpoints
router.get('/', requireAdmin, orderController.getAdminOrders);
router.patch('/:id/status', requireAdmin, orderController.updateOrderStatus);
router.patch('/:id/payment', requireAdmin, orderController.updatePaymentStatus);
router.patch('/:id/internal-notes', requireAdmin, orderController.addInternalNotes);

module.exports = router;
