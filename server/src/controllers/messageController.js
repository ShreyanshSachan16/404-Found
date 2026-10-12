const db = require('../db/database');
const notificationService = require('../services/notificationService');

// Send anonymous platform-mediated message
exports.sendMessage = (req, res) => {
  try {
    const { item_id, receiver_id, message_text, claim_id } = req.body;

    if (!item_id || !message_text || !message_text.trim()) {
      return res.status(400).json({ error: 'Item ID and message content are required.' });
    }

    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(item_id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found.' });
    }

    // Determine target receiver
    let actualReceiverId = receiver_id;
    if (!actualReceiverId) {
      // If sender is owner, default receiver is claimant (if claim_id provided) or finder
      if (req.user.id === item.user_id) {
        if (claim_id) {
          const claim = db.prepare('SELECT claimant_id FROM claims WHERE id = ?').get(claim_id);
          actualReceiverId = claim ? claim.claimant_id : null;
        }
      } else {
        // Sender is student reaching out to item reporter
        actualReceiverId = item.user_id;
      }
    }

    if (!actualReceiverId) {
      return res.status(400).json({ error: 'Could not determine message recipient.' });
    }

    const insertMsg = db.prepare(`
      INSERT INTO messages (claim_id, item_id, sender_id, receiver_id, message_text)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = insertMsg.run(
      claim_id || null,
      item_id,
      req.user.id,
      actualReceiverId,
      message_text.trim()
    );

    // Notify receiver
    notificationService.createNotification(db, {
      userId: actualReceiverId,
      title: '💬 New Anonymous Message Received',
      message: `You received a message regarding "${item.title}": "${message_text.slice(0, 60)}..."`,
      type: 'MESSAGE_RECEIVED',
      linkUrl: `/item/${item_id}`
    });

    const msg = db.prepare(`
      SELECT m.*, u.full_name as sender_name, u.role as sender_role
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({
      message: 'Message sent securely through platform relay.',
      data: {
        ...msg,
        sender_label: req.user.role === 'admin' 
          ? 'Campus Administration' 
          : (req.user.id === item.user_id ? 'Item Reporter' : 'Verified Inquirer')
      }
    });
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ error: 'Failed to send message.' });
  }
};

// Get messages for an item (accessible by participants and admin)
exports.getItemMessages = (req, res) => {
  try {
    const { itemId } = req.params;
    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);

    if (!item) {
      return res.status(404).json({ error: 'Item not found.' });
    }

    // Only allow item reporter, message participants, or admins
    let messages = [];
    if (req.user.role === 'admin') {
      messages = db.prepare(`
        SELECT m.*, u.full_name as sender_name, u.role as sender_role
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.item_id = ?
        ORDER BY m.created_at ASC
      `).all(itemId);
    } else {
      messages = db.prepare(`
        SELECT m.*, u.full_name as sender_name, u.role as sender_role
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.item_id = ? AND (m.sender_id = ? OR m.receiver_id = ?)
        ORDER BY m.created_at ASC
      `).all(itemId, req.user.id, req.user.id);
    }

    // Mask names to protect privacy
    const masked = messages.map(m => {
      const isSenderSelf = m.sender_id === req.user.id;
      let label = isSenderSelf ? 'You' : 'Campus Member';
      if (m.sender_role === 'admin') label = 'Campus Admin';
      else if (m.sender_id === item.user_id) label = 'Item Reporter (Finder/Owner)';

      return {
        ...m,
        sender_label: label,
        is_mine: isSenderSelf
      };
    });

    res.json({ messages: masked });
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ error: 'Failed to fetch messages.' });
  }
};
