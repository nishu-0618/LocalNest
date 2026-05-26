// routes/notifications.js

const express = require('express');
const router = express.Router();
const controller = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

router.use(protect); // Protect all notifications routes

// All standard routes
router.route('/')
  .post(controller.createNotification);

router.get('/:userId', controller.getUserNotifications);
router.put('/:id/read', controller.markAsRead);
router.put('/read-all/:userId', controller.markAllRead);
router.delete('/:id', controller.deleteNotification);

module.exports = router;
