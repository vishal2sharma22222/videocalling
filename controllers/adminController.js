const db = require('../config/database');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Admin Login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const [admins] = await db.query(
            'SELECT * FROM admin_users WHERE email = ? AND is_active = 1',
            [email]
        );

        if (admins.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const admin = admins[0];
        const isMatch = await bcrypt.compare(password, admin.password_hash);

        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate Token
        const token = jwt.sign(
            { adminId: admin.id, role: admin.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            admin: {
                id: admin.id,
                email: admin.email,
                role: admin.role,
                name: admin.full_name
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

// Dashboard Stats
exports.getDashboardStats = async (req, res) => {
    try {
        const [userCount] = await db.query('SELECT COUNT(*) as total FROM users');
        const [callCount] = await db.query('SELECT COUNT(*) as total FROM call_logs');
        const [reportCount] = await db.query('SELECT COUNT(*) as total FROM reports WHERE status = "pending"');
        const [revenue] = await db.query('SELECT SUM(amount) as total FROM payments WHERE status = "completed"');

        res.json({
            users: userCount[0].total,
            calls: callCount[0].total,
            reports: reportCount[0].total,
            revenue: revenue[0].total || 0
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

// Get Users
exports.getUsers = async (req, res) => {
    try {
        const [users] = await db.query(
            'SELECT id, username, email, is_premium, is_banned, created_at FROM users ORDER BY created_at DESC LIMIT 100'
        );
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

// Ban User
exports.banUser = async (req, res) => {
    try {
        const { userId, reason } = req.body;
        await db.query(
            'UPDATE users SET is_banned = 1 WHERE id = ?',
            [userId]
        );
        // Log action
        await db.query(
            'INSERT INTO audit_logs (admin_id, action, target_id, details) VALUES (?, ?, ?, ?)',
            [req.admin.adminId, 'ban_user', userId, reason]
        );
        res.json({ message: 'User banned successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};
