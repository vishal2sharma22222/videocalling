const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authLimiter, otpLimiter } = require('../middleware/rateLimiter');
const { verifyToken } = require('../middleware/authMiddleware');

// Send OTP
router.post('/send-otp', otpLimiter, authController.sendOTP);

// Verify OTP and login/register
router.post('/verify-otp', authLimiter, authController.verifyOTP);
router.post('/register', authController.register);
router.post('/login', authController.login);

// Guest login
router.post('/guest-login', authController.guestLogin);

// Logout
router.post('/logout', verifyToken, authController.logout);

// Refresh token
router.post('/refresh-token', authController.refreshToken);

module.exports = router;
