const fs = require('fs');
const path = require('path');
const db = require('../db/database');
const config = require('../config');
const notificationService = require('../services/notificationService');

// Submit an ownership claim for a found item
exports.submitClaim = (req, res) => {
  try {
    const { item_id, proof_description, hidden_marks_answers, secret_contents } = req.body;

    if (!item_id || !proof_description) {
      return res.status(400).json({ error: 'Item ID and proof of ownership description are required.' });
    }

    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(item_id);
    if (!item) {
      return res.status(404).json({ error: 'Found item not found.' });
    }

    if (item.type !== 'found') {
      return res.status(400).json({ error: 'Ownership claims can only be filed against found items.' });
    }

    if (item.user_id === req.user.id) {
      return res.status(400).json({ error: 'You reported this item as found; you cannot claim your own report.' });
    }

    // Check if user already has an active claim on this item
    const existingClaim = db.prepare(`
      SELECT id, status FROM claims 
      WHERE item_id = ? AND claimant_id = ? AND status != 'CANCELLED'
    `).get(item_id, req.user.id);

    if (existingClaim) {
      return res.status(409).json({
        error: `You already have an existing claim for this item with status: ${existingClaim.status}.`
      });
    }

    let receipt_image = null;
    if (req.file) {
      receipt_image = `/api/claims/receipt-file/${req.file.filename}`;
    }

    const insertClaim = db.prepare(`
      INSERT INTO claims (
        item_id, claimant_id, proof_description, 
        hidden_marks_answers, secret_contents, receipt_image, status
      ) VALUES (?, ?, ?, ?, ?, ?, 'VERIFICATION_PENDING')
    `);

    const result = insertClaim.run(
      item_id,
      req.user.id,
      proof_description.trim(),
      hidden_marks_answers ? hidden_marks_answers.trim() : null,
      secret_contents ? secret_contents.trim() : null,
      receipt_image
    );

    // Update item status to VERIFICATION_PENDING
    db.prepare("UPDATE items SET status = 'VERIFICATION_PENDING', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(item_id);

    const claim = db.prepare('SELECT * FROM claims WHERE id = ?').get(result.lastInsertRowid);

    // Notify item finder
    notificationService.createClaimSubmittedNotification(db, item, claim);

    res.status(201).json({
      message: 'Claim submitted successfully. Campus administration will review your verification details.',
      claim
    });
  } catch (err) {
    console.error('Submit claim error:', err);
    res.status(500).json({ error: 'Failed to submit ownership claim.' });
  }
};

// Get claims submitted by current user
exports.getMyClaims = (req, res) => {
  try {
    const claims = db.prepare(`
      SELECT c.*, i.title as item_title, i.category, i.location, i.primary_image, i.status as item_status
      FROM claims c
      JOIN items i ON c.item_id = i.id
      WHERE c.claimant_id = ?
      ORDER BY c.created_at DESC
    `).all(req.user.id);

    res.json({ claims });
  } catch (err) {
    console.error('Get my claims error:', err);
    res.status(500).json({ error: 'Failed to fetch your claims.' });
  }
};

// Admin reviews claim (approve / reject)
exports.reviewClaim = (req, res) => {
  try {
    const { claimId } = req.params;
    const { decision, admin_notes } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(decision)) {
      return res.status(400).json({ error: 'Decision must be either APPROVED or REJECTED.' });
    }

    const claim = db.prepare('SELECT * FROM claims WHERE id = ?').get(claimId);
    if (!claim) {
      return res.status(404).json({ error: 'Claim not found.' });
    }

    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(claim.item_id);

    // Update claim status
    db.prepare(`
      UPDATE claims
      SET status = ?, admin_notes = ?, reviewer_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(decision, admin_notes || null, req.user.id, claimId);

    // If approved, update item status to VERIFIED
    if (decision === 'APPROVED') {
      db.prepare("UPDATE items SET status = 'VERIFIED', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(claim.item_id);
    } else {
      // If rejected, check if there are other pending claims
      const otherClaims = db.prepare("SELECT id FROM claims WHERE item_id = ? AND status = 'VERIFICATION_PENDING' AND id != ?").all(claim.item_id, claimId);
      if (otherClaims.length === 0) {
        db.prepare("UPDATE items SET status = 'FOUND', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(claim.item_id);
      }
    }

    // Send notification to claimant
    notificationService.createClaimStatusNotification(db, claim.claimant_id, item, decision, admin_notes);

    // Log admin action
    db.prepare(`
      INSERT INTO admin_audit_logs (admin_id, action, target_type, target_id, details)
      VALUES (?, ?, 'CLAIM', ?, ?)
    `).run(req.user.id, `CLAIM_${decision}`, claimId, `Decision: ${decision}. Notes: ${admin_notes || 'None'}`);

    const updatedClaim = db.prepare('SELECT * FROM claims WHERE id = ?').get(claimId);

    res.json({
      message: `Claim successfully ${decision.toLowerCase()}.`,
      claim: updatedClaim
    });
  } catch (err) {
    console.error('Review claim error:', err);
    res.status(500).json({ error: 'Failed to review claim.' });
  }
};

// Confirm item returned / handed over to verified owner
exports.confirmReturn = (req, res) => {
  try {
    const { itemId } = req.params;
    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);

    if (!item) {
      return res.status(404).json({ error: 'Item not found.' });
    }

    // Only item owner or admin can mark as returned
    if (item.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to confirm return of this item.' });
    }

    db.prepare("UPDATE items SET status = 'RETURNED', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(itemId);

    // Update approved claims to HANDED_OVER
    db.prepare("UPDATE claims SET status = 'HANDED_OVER', updated_at = CURRENT_TIMESTAMP WHERE item_id = ? AND status = 'APPROVED'").run(itemId);

    // Notify item reporter
    notificationService.createItemStatusNotification(db, item, 'RETURNED');

    // Audit log
    db.prepare(`
      INSERT INTO admin_audit_logs (admin_id, action, target_type, target_id, details)
      VALUES (?, 'ITEM_RETURNED', 'ITEM', ?, 'Item marked as successfully returned to owner')
    `).run(req.user.id, itemId);

    res.json({
      message: 'Item has been successfully marked as RETURNED. Congratulations on the recovery!',
      status: 'RETURNED'
    });
  } catch (err) {
    console.error('Confirm return error:', err);
    res.status(500).json({ error: 'Failed to confirm item return.' });
  }
};

// Get receipt by claim ID (Claimant or Admin only)
exports.getClaimReceipt = (req, res) => {
  try {
    const { claimId } = req.params;
    const claim = db.prepare('SELECT * FROM claims WHERE id = ?').get(claimId);

    if (!claim || !claim.receipt_image) {
      return res.status(404).json({ error: 'Receipt not found for this claim.' });
    }

    if (claim.claimant_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. You do not have permission to view this receipt.' });
    }

    const filename = path.basename(claim.receipt_image);
    let filePath = path.join(config.RECEIPTS_DIR, filename);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(config.UPLOAD_DIR, filename);
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Receipt file not found on disk.' });
    }

    res.sendFile(filePath);
  } catch (err) {
    console.error('Get receipt error:', err);
    res.status(500).json({ error: 'Failed to retrieve receipt.' });
  }
};

// Get receipt by filename (Claimant or Admin only)
exports.getReceiptByFilename = (req, res) => {
  try {
    const rawFilename = path.basename(req.params.filename);
    const sanitized = rawFilename.replace(/[^a-zA-Z0-9._-]/g, '');

    const claim = db.prepare('SELECT * FROM claims WHERE receipt_image LIKE ?').get(`%${sanitized}%`);
    if (!claim) {
      // Check if user is admin
      if (req.user.role !== 'admin') {
        return res.status(404).json({ error: 'Receipt file not found or unauthorized.' });
      }
    } else if (claim.claimant_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. You do not have permission to view this receipt.' });
    }

    let filePath = path.join(config.RECEIPTS_DIR, sanitized);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(config.UPLOAD_DIR, sanitized);
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Receipt file not found on disk.' });
    }

    res.sendFile(filePath);
  } catch (err) {
    console.error('Get receipt by filename error:', err);
    res.status(500).json({ error: 'Failed to retrieve receipt file.' });
  }
};
