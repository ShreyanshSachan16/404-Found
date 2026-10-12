const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// All admin routes require admin authentication
router.use(authenticateToken, requireAdmin);

router.get('/dashboard-stats', adminController.getDashboardStats);
router.get('/users', adminController.getUsers);
router.put('/users/:userId/toggle-suspension', adminController.toggleUserSuspension);
router.put('/users/:userId/role', adminController.changeUserRole);
router.get('/claims', adminController.getAllClaims);
router.put('/ai-settings', adminController.updateAiSettings);
router.post('/archive-old', adminController.archiveOldItems);

module.exports = router;
