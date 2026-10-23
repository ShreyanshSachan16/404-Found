const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', optionalAuth, authController.logout);
router.get('/me', authenticateToken, authController.getMe);
router.put('/profile', authenticateToken, authController.updateProfile);

module.exports = router;
