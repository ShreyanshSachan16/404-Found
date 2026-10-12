const db = require('../db/database');

// Get notifications for current user
exports.getMyNotifications = (req, res) => {
  try {
    const notifications = db.prepare(`
      SELECT * FROM notifications
      WHERE user_id = ?
      ORDER BY is_read ASC, created_at DESC
      LIMIT 50
    `).all(req.user.id);

    const unreadCount = db.prepare(`
      SELECT COUNT(*) as count FROM notifications
      WHERE user_id = ? AND is_read = 0
    `).get(req.user.id).count;

    res.json({
      unreadCount,
      notifications
    });
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
};

// Mark single notification as read
exports.markAsRead = (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(id, req.user.id);
    res.json({ message: 'Notification marked as read.' });
  } catch (err) {
    console.error('Mark notification read error:', err);
    res.status(500).json({ error: 'Failed to update notification.' });
  }
};

// Mark all as read
exports.markAllAsRead = (req, res) => {
  try {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
    res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    console.error('Mark all read error:', err);
    res.status(500).json({ error: 'Failed to update notifications.' });
  }
};
