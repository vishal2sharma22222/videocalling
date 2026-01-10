const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAdmin } = require('../middleware/authMiddleware');

// Public Admin Routes
router.post('/login', adminController.login);

// Protected Admin Routes
router.use(requireAdmin);

router.get('/stats', adminController.getDashboardStats);
router.get('/users', adminController.getUsers);
router.post('/users/ban', adminController.banUser);

module.exports = router;
