const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public or optional auth routes
router.get('/', optionalAuth, itemController.getItems);
router.get('/stats', itemController.getItemStats);
router.post('/check-duplicate', optionalAuth, itemController.checkDuplicate);
router.get('/:id', optionalAuth, itemController.getItemById);
router.get('/:id/qrcode', itemController.getItemQRCode);

// Protected routes
router.post('/', authenticateToken, upload.single('image'), upload.verifyUploadMagicBytes('image'), itemController.createItem);
router.put('/:id', authenticateToken, upload.single('image'), upload.verifyUploadMagicBytes('image'), itemController.updateItem);
router.delete('/:id', authenticateToken, itemController.deleteItem);

module.exports = router;
