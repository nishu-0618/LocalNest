// controllers/notificationController.js
// Manages user notifications

const Notification = require('../models/Notification');

// ─────────────────────────────────────────────
// @desc    Get notifications for a user
// @route   GET /api/notifications/:userId
// ─────────────────────────────────────────────
exports.getUserNotifications = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { limit = 20 } = req.query;

    const notifications = await Notification.find({ recipient: userId })
      .populate('relatedListing', 'title type')
      .select('-__v')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      isRead: false,
    });

    res.status(200).json({
      success: true,
      unreadCount,
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Mark a single notification as read
// @route   PUT /api/notifications/:id/read
// ─────────────────────────────────────────────
exports.markAsRead = async (req, res, next) => {
  try {
    const notif = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );
    if (!notif) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.status(200).json({ success: true, data: notif });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Mark ALL notifications as read for a user
// @route   PUT /api/notifications/read-all/:userId
// ─────────────────────────────────────────────
exports.markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipient: req.params.userId, isRead: false },
      { isRead: true }
    );
    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Create a notification (internal use or direct API)
// @route   POST /api/notifications
// ─────────────────────────────────────────────
exports.createNotification = async (req, res, next) => {
  try {
    const notif = await Notification.create(req.body);
    res.status(201).json({ success: true, data: notif });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
// ─────────────────────────────────────────────
exports.deleteNotification = async (req, res, next) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    next(error);
  }
};
