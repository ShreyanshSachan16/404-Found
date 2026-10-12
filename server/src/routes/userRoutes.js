const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

router.get('/dashboard-summary', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;

    // Counts
    const lostCount = db.prepare("SELECT COUNT(*) as count FROM items WHERE user_id = ? AND type = 'lost'").get(userId).count;
    const foundCount = db.prepare("SELECT COUNT(*) as count FROM items WHERE user_id = ? AND type = 'found'").get(userId).count;
    
    // Potential matches linked to user's lost or found items
    const matchesCount = db.prepare(`
      SELECT COUNT(DISTINCT m.id) as count 
      FROM matches m
      JOIN items i1 ON m.lost_item_id = i1.id
      JOIN items i2 ON m.found_item_id = i2.id
      WHERE (i1.user_id = ? OR i2.user_id = ?) AND m.status = 'SUGGESTED'
    `).get(userId, userId).count;

    // Active claims submitted by user or on user's found items
    const activeClaimsCount = db.prepare(`
      SELECT COUNT(*) as count 
      FROM claims 
      WHERE claimant_id = ? AND status IN ('VERIFICATION_PENDING', 'APPROVED')
    `).get(userId).count;

    // Returned items
    const returnedCount = db.prepare("SELECT COUNT(*) as count FROM items WHERE user_id = ? AND status = 'RETURNED'").get(userId).count;

    // User's items
    const myItems = db.prepare(`
      SELECT * FROM items
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(userId);

    // User's claims
    const myClaims = db.prepare(`
      SELECT c.*, i.title as item_title, i.category, i.primary_image, i.location, i.status as item_status
      FROM claims c
      JOIN items i ON c.item_id = i.id
      WHERE c.claimant_id = ?
      ORDER BY c.created_at DESC
    `).all(userId);

    // User's potential matches list with match partner info
    const myMatches = db.prepare(`
      SELECT m.*, 
        lost.title as lost_title, lost.primary_image as lost_image, lost.user_id as lost_user_id,
        found.title as found_title, found.primary_image as found_image, found.user_id as found_user_id
      FROM matches m
      JOIN items lost ON m.lost_item_id = lost.id
      JOIN items found ON m.found_item_id = found.id
      WHERE lost.user_id = ? OR found.user_id = ?
      ORDER BY m.overall_score DESC
    `).all(userId, userId);

    res.json({
      summary: {
        myLostItems: lostCount,
        myFoundItems: foundCount,
        potentialMatches: matchesCount,
        activeClaims: activeClaimsCount,
        returnedItems: returnedCount
      },
      myItems,
      myClaims,
      myMatches
    });
  } catch (err) {
    console.error('User dashboard error:', err);
    res.status(500).json({ error: 'Failed to retrieve user dashboard data.' });
  }
});

module.exports = router;
