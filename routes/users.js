const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/profile', verifyToken, userController.getProfile);
router.put('/profile', verifyToken, userController.updateProfile);
router.post('/block/:userId', verifyToken, userController.blockUser);
router.get('/blocked', verifyToken, userController.getBlockedUsers);

module.exports = router;
