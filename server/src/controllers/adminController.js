const db = require('../db/database');
const config = require('../config');

// Get overall stats and analytics for dashboard
exports.getDashboardStats = (req, res) => {
  try {
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const totalLost = db.prepare("SELECT COUNT(*) as count FROM items WHERE type = 'lost'").get().count;
    const totalFound = db.prepare("SELECT COUNT(*) as count FROM items WHERE type = 'found'").get().count;
    const potentialMatches = db.prepare("SELECT COUNT(*) as count FROM matches WHERE status = 'SUGGESTED'").get().count;
    const activeClaims = db.prepare("SELECT COUNT(*) as count FROM claims WHERE status = 'VERIFICATION_PENDING'").get().count;
    const returnedItems = db.prepare("SELECT COUNT(*) as count FROM items WHERE status = 'RETURNED'").get().count;
    
    // Recovery Rate = (Returned Items / Total Reported Items) * 100
    const totalReports = totalLost + totalFound;
    const recoveryRate = totalReports > 0 ? Math.round((returnedItems / (totalLost || 1)) * 100) : 0;

    // Items by category
    const byCategory = db.prepare(`
      SELECT category, COUNT(*) as count 
      FROM items 
      GROUP BY category 
      ORDER BY count DESC
    `).all();

    // Items by location
    const byLocation = db.prepare(`
      SELECT location, COUNT(*) as count 
      FROM items 
      GROUP BY location 
      ORDER BY count DESC
    `).all();

    // Items by status
    const byStatus = db.prepare(`
      SELECT status, COUNT(*) as count 
      FROM items 
      GROUP BY status 
      ORDER BY count DESC
    `).all();

    // Recent items
    const recentReports = db.prepare(`
      SELECT i.*, u.full_name as reporter_name 
      FROM items i 
      JOIN users u ON i.user_id = u.id 
      ORDER BY i.created_at DESC 
      LIMIT 10
    `).all();

    // Recent audit logs
    const recentLogs = db.prepare(`
      SELECT a.*, COALESCE(u.full_name, 'System Administrator') as admin_name 
      FROM admin_audit_logs a 
      LEFT JOIN users u ON a.admin_id = u.id 
      ORDER BY a.created_at DESC 
      LIMIT 15
    `).all();

    // Genuine average days from intake to recovery
    const avgDaysRow = db.prepare(`
      SELECT AVG(julianday(updated_at) - julianday(created_at)) as avg_days
      FROM items
      WHERE status = 'RETURNED'
    `).get();
    const avgRecoveryDays = avgDaysRow && avgDaysRow.avg_days !== null
      ? Math.max(0.1, Math.round(avgDaysRow.avg_days * 10) / 10)
      : 0;

    res.json({
      summary: {
        totalUsers,
        totalLost,
        totalFound,
        totalReports,
        potentialMatches,
        activeClaims,
        returnedItems,
        recoveryRate: `${recoveryRate}%`,
        avgRecoveryDays
      },
      charts: {
        byCategory,
        byLocation,
        byStatus
      },
      recentReports,
      recentLogs,
      aiWeights: config.AI_CONFIG
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Failed to retrieve admin dashboard stats.' });
  }
};

// Get all users
exports.getUsers = (req, res) => {
  try {
    const users = db.prepare(`
      SELECT id, email, full_name, student_id, phone, department, role, is_suspended, created_at,
             (SELECT COUNT(*) FROM items WHERE user_id = users.id) as items_count,
             (SELECT COUNT(*) FROM claims WHERE claimant_id = users.id) as claims_count
      FROM users
      ORDER BY created_at DESC
    `).all();

    res.json({ users });
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Failed to retrieve user list.' });
  }
};

// Toggle user suspension
exports.toggleUserSuspension = (req, res) => {
  try {
    const { userId } = req.params;
    const user = db.prepare('SELECT id, full_name, is_suspended FROM users WHERE id = ?').get(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (parseInt(userId, 10) === req.user.id) {
      return res.status(400).json({ error: 'You cannot suspend your own administrative account.' });
    }

    const newSuspensionState = user.is_suspended ? 0 : 1;
    db.prepare('UPDATE users SET is_suspended = ? WHERE id = ?').run(newSuspensionState, userId);

    db.prepare(`
      INSERT INTO admin_audit_logs (admin_id, action, target_type, target_id, details)
      VALUES (?, ?, 'USER', ?, ?)
    `).run(
      req.user.id,
      newSuspensionState ? 'SUSPEND_USER' : 'UNSUSPEND_USER',
      userId,
      `User ${user.full_name} status toggled to suspended=${newSuspensionState}`
    );

    res.json({
      message: `User ${user.full_name} has been ${newSuspensionState ? 'suspended' : 're-activated'}.`,
      is_suspended: newSuspensionState
    });
  } catch (err) {
    console.error('Toggle suspension error:', err);
    res.status(500).json({ error: 'Failed to update user suspension state.' });
  }
};

// Change user role
exports.changeUserRole = (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['student', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Role must be student or admin.' });
    }

    if (parseInt(userId, 10) === req.user.id && role !== 'admin') {
      return res.status(400).json({ error: 'You cannot demote your own account.' });
    }

    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, userId);

    db.prepare(`
      INSERT INTO admin_audit_logs (admin_id, action, target_type, target_id, details)
      VALUES (?, 'ROLE_CHANGE', 'USER', ?, ?)
    `).run(req.user.id, userId, `Role changed to ${role}`);

    res.json({ message: `User role updated to ${role}.` });
  } catch (err) {
    console.error('Change role error:', err);
    res.status(500).json({ error: 'Failed to update user role.' });
  }
};

// Get all claims for admin review
exports.getAllClaims = (req, res) => {
  try {
    const claims = db.prepare(`
      SELECT c.*, 
             u.full_name as claimant_name, u.email as claimant_email, u.student_id as claimant_student_id,
             i.title as item_title, i.category as item_category, i.location as item_location,
             i.primary_image as item_image, i.identifying_marks as item_actual_marks,
             i.status as item_status,
             reporter.full_name as finder_name
      FROM claims c
      JOIN users u ON c.claimant_id = u.id
      JOIN items i ON c.item_id = i.id
      JOIN users reporter ON i.user_id = reporter.id
      ORDER BY CASE WHEN c.status = 'VERIFICATION_PENDING' THEN 1 ELSE 2 END, c.created_at DESC
    `).all();

    res.json({ claims });
  } catch (err) {
    console.error('Get all claims error:', err);
    res.status(500).json({ error: 'Failed to retrieve claims for review.' });
  }
};

// Update AI matching weights in settings
exports.updateAiSettings = (req, res) => {
  try {
    const { TEXT_WEIGHT, IMAGE_WEIGHT, LOCATION_WEIGHT, DATE_WEIGHT, CATEGORY_WEIGHT, MIN_MATCH_THRESHOLD } = req.body;

    if (TEXT_WEIGHT !== undefined) config.AI_CONFIG.TEXT_WEIGHT = parseFloat(TEXT_WEIGHT);
    if (IMAGE_WEIGHT !== undefined) config.AI_CONFIG.IMAGE_WEIGHT = parseFloat(IMAGE_WEIGHT);
    if (LOCATION_WEIGHT !== undefined) config.AI_CONFIG.LOCATION_WEIGHT = parseFloat(LOCATION_WEIGHT);
    if (DATE_WEIGHT !== undefined) config.AI_CONFIG.DATE_WEIGHT = parseFloat(DATE_WEIGHT);
    if (CATEGORY_WEIGHT !== undefined) config.AI_CONFIG.CATEGORY_WEIGHT = parseFloat(CATEGORY_WEIGHT);
    if (MIN_MATCH_THRESHOLD !== undefined) config.AI_CONFIG.MIN_MATCH_THRESHOLD = parseFloat(MIN_MATCH_THRESHOLD);

    db.prepare(`
      INSERT INTO admin_audit_logs (admin_id, action, target_type, details)
      VALUES (?, 'UPDATE_AI_CONFIG', 'SYSTEM', ?)
    `).run(req.user.id, `AI weights adjusted: ${JSON.stringify(config.AI_CONFIG)}`);

    res.json({
      message: 'AI matching engine parameters updated successfully.',
      currentConfig: config.AI_CONFIG
    });
  } catch (err) {
    console.error('Update AI settings error:', err);
    res.status(500).json({ error: 'Failed to update AI settings.' });
  }
};

// Batch archive old unresolved items
exports.archiveOldItems = (req, res) => {
  try {
    const { days = 45 } = req.body;
    const thresholdDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const result = db.prepare(`
      UPDATE items 
      SET status = 'ARCHIVED', updated_at = CURRENT_TIMESTAMP
      WHERE status IN ('LOST', 'FOUND', 'POTENTIAL_MATCH')
      AND date_lost_or_found < ?
    `).run(thresholdDate);

    db.prepare(`
      INSERT INTO admin_audit_logs (admin_id, action, target_type, details)
      VALUES (?, 'BATCH_ARCHIVE', 'SYSTEM', ?)
    `).run(req.user.id, `Archived ${result.changes} items older than ${days} days (${thresholdDate})`);

    res.json({
      message: `Archived ${result.changes} outdated items successfully.`,
      archivedCount: result.changes
    });
  } catch (err) {
    console.error('Batch archive error:', err);
    res.status(500).json({ error: 'Failed to archive items.' });
  }
};
