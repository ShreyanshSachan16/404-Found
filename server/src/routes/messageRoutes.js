const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { authenticateToken } = require('../middleware/auth');

router.post('/', authenticateToken, messageController.sendMessage);
router.get('/item/:itemId', authenticateToken, messageController.getItemMessages);

module.exports = router;
