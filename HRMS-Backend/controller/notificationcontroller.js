import Notification from "../models/notification.js";

// ── Helper — call this from any controller to create a notification ──────────
export const createNotification = async ({ recipient, message, type = "info" }) => {
  try {
    await Notification.create({ recipient, message, type });

  } catch (err) {
    console.error("Failed to create notification:", err.message);
  }

};

// ── GET /notifications — fetch notifications for logged-in user ──────────────
export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(20);

    const unreadCount = await Notification.countDocuments({
      recipient: req.user.userId,
      read: false
    });

    res.json({ notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── PUT /notifications/mark-read — mark all as read ──────────────────────────
export const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.userId, read: false },
      { read: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};