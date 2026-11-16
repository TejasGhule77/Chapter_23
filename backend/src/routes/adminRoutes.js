const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authenticate = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');

router.use(authenticate, requireAdmin);

router.get('/dashboard', adminController.getDashboardMetrics);
router.get('/customers', adminController.getCustomers);
router.get('/customers/:id', adminController.getCustomerDetails);
router.get('/logins', adminController.getLoginEvents);

module.exports = router;
