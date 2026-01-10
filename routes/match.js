const express = require('express');
const router = express.Router();
const matchController = require('../controllers/matchController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/find', verifyToken, matchController.findMatch);
router.post('/skip', verifyToken, matchController.skipMatch);

module.exports = router;
