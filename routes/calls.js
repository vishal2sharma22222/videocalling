const express = require('express');
const router = express.Router();
const callController = require('../controllers/callController');
const { verifyToken, requirePremium } = require('../middleware/authMiddleware');

router.get('/history', verifyToken, requirePremium, callController.getCallHistory);
router.post('/log', verifyToken, callController.logCall);

module.exports = router;
