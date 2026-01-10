const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/plans', (req, res) => {
    res.json({ plans: [] });
});

module.exports = router;
