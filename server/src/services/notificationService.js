/**
 * Notification Service for in-app alert events
 */

function createNotification(db, { userId, title, message, type, linkUrl }) {
  try {
    const stmt = db.prepare(`
      INSERT INTO notifications (user_id, title, message, type, link_url, is_read)
      VALUES (?, ?, ?, ?, ?, 0)
    `);
    const result = stmt.run(userId, title, message, type, linkUrl || null);
    return result.lastInsertRowid;
  } catch (err) {
    console.error('Failed to create notification:', err);
    return null;
  }
}

function createMatchNotification(db, lostItem, foundItem, overallScore) {
  const percent = Math.round(overallScore * 100);
  const lostLink = `/item/${lostItem.id}?match=${foundItem.id}`;
  const foundLink = `/item/${foundItem.id}?match=${lostItem.id}`;

  // Deduplicate: check if notification for this match link was already sent
  const existing = db.prepare(`
    SELECT id FROM notifications
    WHERE user_id = ? AND type = 'MATCH_FOUND' AND link_url = ?
  `).get(lostItem.user_id, lostLink);

  if (existing) {
    return; // Already notified
  }

  // Notify the user who lost the item
  createNotification(db, {
    userId: lostItem.user_id,
    title: '🔔 Potential Match Found',
    message: `Your lost "${lostItem.title}" has a possible match with a ${percent}% match confidence score.`,
    type: 'MATCH_FOUND',
    linkUrl: lostLink
  });

  // Notify the finder
  createNotification(db, {
    userId: foundItem.user_id,
    title: '🔔 Potential Owner Match',
    message: `The item "${foundItem.title}" you found has a potential match with a reported lost item (${percent}% confidence).`,
    type: 'MATCH_FOUND',
    linkUrl: foundLink
  });
}

function createClaimSubmittedNotification(db, item, claim) {
  createNotification(db, {
    userId: item.user_id,
    title: '📋 New Ownership Claim Submitted',
    message: `A user has submitted an ownership claim for your found item "${item.title}". It is currently pending admin review.`,
    type: 'CLAIM_SUBMITTED',
    linkUrl: `/item/${item.id}`
  });
}

function createClaimStatusNotification(db, claimantId, item, status, notes) {
  const isApproved = status === 'APPROVED';
  createNotification(db, {
    userId: claimantId,
    title: isApproved ? '🎉 Claim Approved!' : '⚠️ Claim Update',
    message: isApproved
      ? `Your claim for "${item.title}" was approved by the campus admin! Visit the designated pickup location to collect it.`
      : `Your claim for "${item.title}" was rejected. Note: ${notes || 'Verification criteria could not be established.'}`,
    type: isApproved ? 'CLAIM_APPROVED' : 'CLAIM_REJECTED',
    linkUrl: `/item/${item.id}`
  });
}

function createItemStatusNotification(db, item, newStatus) {
  createNotification(db, {
    userId: item.user_id,
    title: '📦 Item Status Updated',
    message: `Your item "${item.title}" status has changed to ${newStatus}.`,
    type: 'ITEM_STATUS',
    linkUrl: `/item/${item.id}`
  });
}

module.exports = {
  createNotification,
  createMatchNotification,
  createClaimSubmittedNotification,
  createClaimStatusNotification,
  createItemStatusNotification
};
