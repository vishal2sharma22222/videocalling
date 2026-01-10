const express = require('express');
const router = express.Router();
const moderationController = require('../controllers/moderationController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/create', verifyToken, moderationController.reportUser);
router.get('/my-reports', verifyToken, moderationController.getMyReports);

module.exports = router;
