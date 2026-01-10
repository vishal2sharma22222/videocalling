const jwt = require('jsonwebtoken');
const db = require('../config/database');

// Verify JWT token
const verifyToken = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check if user exists and is not banned
        const [users] = await db.query(
            'SELECT id, is_banned, is_guest FROM users WHERE id = ?',
            [decoded.userId]
        );
        
        if (users.length === 0) {
            return res.status(401).json({ error: 'User not found' });
        }
        
        if (users[0].is_banned) {
            return res.status(403).json({ error: 'Account is banned' });
        }
        
        req.user = {
            userId: decoded.userId,
            role: decoded.role || 'user',
            isGuest: users[0].is_guest
        };
        
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// Check if user is premium
const requirePremium = async (req, res, next) => {
    try {
        const [users] = await db.query(
            'SELECT is_premium, subscription_expires_at FROM users WHERE id = ?',
            [req.user.userId]
        );
        
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const user = users[0];
        const now = new Date();
        
        if (!user.is_premium || (user.subscription_expires_at && new Date(user.subscription_expires_at) < now)) {
            return res.status(403).json({ error: 'Premium subscription required' });
        }
        
        next();
    } catch (error) {
        return res.status(500).json({ error: 'Server error' });
    }
};

// Admin authentication
const requireAdmin = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (decoded.role !== 'admin' && decoded.role !== 'super_admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        
        // Verify admin exists
        const [admins] = await db.query(
            'SELECT id, role, is_active FROM admin_users WHERE id = ?',
            [decoded.adminId]
        );
        
        if (admins.length === 0 || !admins[0].is_active) {
            return res.status(403).json({ error: 'Admin access denied' });
        }
        
        req.admin = {
            adminId: decoded.adminId,
            role: decoded.role
        };
        
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid admin token' });
    }
};

module.exports = {
    verifyToken,
    requirePremium,
    requireAdmin
};
