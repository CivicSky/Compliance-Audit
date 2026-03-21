
const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/notifController');
const auth = require('../middleware/auth');

// GET notifications for a user
router.get('/user/:userId', auth, NotificationController.getUserNotifications);

// GET notification counts
router.get('/user/:userId/counts', auth, NotificationController.getNotificationCounts);

// POST create new notification (admin only)
router.post('/create', auth, NotificationController.createNotification);

// PUT mark notification as read
router.put('/:notificationId/read', auth, NotificationController.markAsRead);

// PUT mark all notifications as read for a user
router.put('/user/:userId/read-all', auth, NotificationController.markAllAsRead);

// DELETE notification
router.delete('/:notificationId', auth, NotificationController.deleteNotification);

module.exports = router;
