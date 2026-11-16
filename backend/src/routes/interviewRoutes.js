const express = require('express');
const router = express.Router();
const interviewController = require('../controllers/interviewController');
const authenticate = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');

router.use(authenticate);

// Customer endpoints
router.get('/available-slots', interviewController.getAvailableSlots);
router.post('/book', interviewController.bookSlot);
router.get('/my-interviews', interviewController.getMyInterviews);
router.post('/:id/reschedule-request', interviewController.requestReschedule);

// Admin endpoints
router.post('/admin/slots', requireAdmin, interviewController.createSlot);
router.get('/admin/slots', requireAdmin, interviewController.getAllSlots);
router.delete('/admin/slots/:id', requireAdmin, interviewController.deleteSlot);
router.patch('/admin/:id', requireAdmin, interviewController.updateInterview);
router.get('/admin/:id/notes', requireAdmin, interviewController.getInterviewNotes);
router.post('/admin/notes', requireAdmin, interviewController.saveInterviewNotes);

module.exports = router;
