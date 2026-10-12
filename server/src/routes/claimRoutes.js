const express = require('express');
const router = express.Router();
const claimController = require('../controllers/claimController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

// User routes
router.post('/', authenticateToken, upload.uploadReceipt.single('receipt_image'), claimController.submitClaim);
router.get('/my', authenticateToken, claimController.getMyClaims);
router.get('/:claimId/receipt', authenticateToken, claimController.getClaimReceipt);
router.get('/receipt-file/:filename', authenticateToken, claimController.getReceiptByFilename);
router.post('/:itemId/return', authenticateToken, claimController.confirmReturn);

// Admin routes
router.put('/:claimId/review', authenticateToken, requireAdmin, claimController.reviewClaim);

module.exports = router;
