const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/create-order', verifyToken, (req, res) => {
    res.json({ message: 'Payment endpoint' });
});

module.exports = router;
