const rateLimit = require('express-rate-limit');

// General API rate limiter
const apiLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false
});

// Strict limiter for authentication endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: 'Too many authentication attempts, please try again later',
    skipSuccessfulRequests: true
});

// OTP request limiter
const otpLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 2,
    message: 'Too many OTP requests, please wait before trying again'
});

module.exports = {
    apiLimiter,
    authLimiter,
    otpLimiter
};
