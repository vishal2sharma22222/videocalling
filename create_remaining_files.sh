#!/bin/bash

# Create User Controller
cat > controllers/userController.js << 'EOF'
const db = require('../config/database');

exports.getProfile = async (req, res) => {
    try {
        const [users] = await db.query(
            `SELECT id, phone, email, name, age, gender, region, avatar_url, bio,
                    is_premium, subscription_expires_at, coins_balance, total_calls, total_minutes,
                    created_at
             FROM users WHERE id = ?`,
            [req.user.userId]
        );
        
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ user: users[0] });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { name, age, gender, region, bio } = req.body;
        
        await db.query(
            `UPDATE users SET name = ?, age = ?, gender = ?, region = ?, bio = ? WHERE id = ?`,
            [name, age, gender, region, bio, req.user.userId]
        );
        
        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
};

exports.blockUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { reason } = req.body;
        
        await db.query(
            'INSERT INTO blocked_users (blocker_id, blocked_id, reason) VALUES (?, ?, ?)',
            [req.user.userId, userId, reason]
        );
        
        res.json({ message: 'User blocked successfully' });
    } catch (error) {
        console.error('Block user error:', error);
        res.status(500).json({ error: 'Failed to block user' });
    }
};

exports.getBlockedUsers = async (req, res) => {
    try {
        const [blocked] = await db.query(
            `SELECT u.id, u.name, u.avatar_url, b.created_at
             FROM blocked_users b
             JOIN users u ON b.blocked_id = u.id
             WHERE b.blocker_id = ?`,
            [req.user.userId]
        );
        
        res.json({ blockedUsers: blocked });
    } catch (error) {
        console.error('Get blocked users error:', error);
        res.status(500).json({ error: 'Failed to fetch blocked users' });
    }
};
EOF

# Create Match Controller
cat > controllers/matchController.js << 'EOF'
const db = require('../config/database');
const { findMatch } = require('../services/matchmakingService');

exports.findMatch = async (req, res) => {
    try {
        const { genderFilter, regionFilter } = req.body;
        const userId = req.user.userId;
        
        // Check if user is banned
        const [user] = await db.query('SELECT is_banned FROM users WHERE id = ?', [userId]);
        if (user[0].is_banned) {
            return res.status(403).json({ error: 'Account is banned' });
        }
        
        // Find a match
        const match = await findMatch(userId, { genderFilter, regionFilter });
        
        if (match) {
            res.json({ 
                matched: true,
                matchedUser: match
            });
        } else {
            res.json({ 
                matched: false,
                message: 'Searching for match...'
            });
        }
    } catch (error) {
        console.error('Find match error:', error);
        res.status(500).json({ error: 'Failed to find match' });
    }
};

exports.skipMatch = async (req, res) => {
    try {
        // Logic to skip current match and find new one
        res.json({ message: 'Match skipped' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to skip match' });
    }
};
EOF

# Create Matchmaking Service
cat > services/matchmakingService.js << 'EOF'
const db = require('../config/database');

exports.findMatch = async (userId, filters = {}) => {
    try {
        const { genderFilter, regionFilter } = filters;
        
        // Get blocked users
        const [blocked] = await db.query(
            'SELECT blocked_id FROM blocked_users WHERE blocker_id = ?',
            [userId]
        );
        const blockedIds = blocked.map(b => b.blocked_id);
        
        // Build query
        let query = `
            SELECT id, name, age, gender, region, avatar_url
            FROM users
            WHERE id != ?
            AND is_online = TRUE
            AND is_banned = FALSE
        `;
        const params = [userId];
        
        if (blockedIds.length > 0) {
            query += ` AND id NOT IN (${blockedIds.join(',')})`;
        }
        
        if (genderFilter && genderFilter !== 'any') {
            query += ' AND gender = ?';
            params.push(genderFilter);
        }
        
        if (regionFilter) {
            query += ' AND region = ?';
            params.push(regionFilter);
        }
        
        query += ' ORDER BY RAND() LIMIT 1';
        
        const [matches] = await db.query(query, params);
        
        return matches.length > 0 ? matches[0] : null;
    } catch (error) {
        console.error('Matchmaking error:', error);
        return null;
    }
};
EOF

# Create Call Controller
cat > controllers/callController.js << 'EOF'
const db = require('../config/database');

exports.getCallHistory = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;
        
        const [calls] = await db.query(
            `SELECT c.id, c.started_at, c.ended_at, c.duration_seconds,
                    u.id as partner_id, u.name as partner_name, u.avatar_url as partner_avatar
             FROM calls c
             LEFT JOIN users u ON (c.caller_id = ? AND c.receiver_id = u.id) 
                              OR (c.receiver_id = ? AND c.caller_id = u.id)
             WHERE c.caller_id = ? OR c.receiver_id = ?
             ORDER BY c.started_at DESC
             LIMIT ? OFFSET ?`,
            [req.user.userId, req.user.userId, req.user.userId, req.user.userId, parseInt(limit), offset]
        );
        
        res.json({ calls });
    } catch (error) {
        console.error('Get call history error:', error);
        res.status(500).json({ error: 'Failed to fetch call history' });
    }
};

exports.logCall = async (req, res) => {
    try {
        const { receiverId, startedAt, endedAt, durationSeconds } = req.body;
        
        await db.query(
            `INSERT INTO calls (caller_id, receiver_id, started_at, ended_at, duration_seconds)
             VALUES (?, ?, ?, ?, ?)`,
            [req.user.userId, receiverId, startedAt, endedAt, durationSeconds]
        );
        
        // Update user statistics
        await db.query(
            `UPDATE users SET total_calls = total_calls + 1, total_minutes = total_minutes + ?
             WHERE id IN (?, ?)`,
            [Math.floor(durationSeconds / 60), req.user.userId, receiverId]
        );
        
        res.json({ message: 'Call logged successfully' });
    } catch (error) {
        console.error('Log call error:', error);
        res.status(500).json({ error: 'Failed to log call' });
    }
};
EOF

# Create Moderation Controller
cat > controllers/moderationController.js << 'EOF'
const db = require('../config/database');

exports.reportUser = async (req, res) => {
    try {
        const { reportedUserId, callId, reason, description, evidenceUrl } = req.body;
        
        await db.query(
            `INSERT INTO reports (reporter_id, reported_user_id, call_id, reason, description, evidence_url)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [req.user.userId, reportedUserId, callId, reason, description, evidenceUrl]
        );
        
        // Check if user should be auto-banned
        const [reportCount] = await db.query(
            'SELECT COUNT(*) as count FROM reports WHERE reported_user_id = ? AND status = "pending"',
            [reportedUserId]
        );
        
        const threshold = parseInt(process.env.AUTO_BAN_THRESHOLD) || 5;
        if (reportCount[0].count >= threshold) {
            await db.query(
                'UPDATE users SET is_banned = TRUE, ban_reason = "Multiple reports" WHERE id = ?',
                [reportedUserId]
            );
        }
        
        res.json({ message: 'Report submitted successfully' });
    } catch (error) {
        console.error('Report user error:', error);
        res.status(500).json({ error: 'Failed to submit report' });
    }
};

exports.getMyReports = async (req, res) => {
    try {
        const [reports] = await db.query(
            `SELECT r.*, u.name as reported_user_name
             FROM reports r
             JOIN users u ON r.reported_user_id = u.id
             WHERE r.reporter_id = ?
             ORDER BY r.created_at DESC`,
            [req.user.userId]
        );
        
        res.json({ reports });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch reports' });
    }
};
EOF

# Create Routes
cat > routes/users.js << 'EOF'
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/profile', verifyToken, userController.getProfile);
router.put('/profile', verifyToken, userController.updateProfile);
router.post('/block/:userId', verifyToken, userController.blockUser);
router.get('/blocked', verifyToken, userController.getBlockedUsers);

module.exports = router;
EOF

cat > routes/match.js << 'EOF'
const express = require('express');
const router = express.Router();
const matchController = require('../controllers/matchController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/find', verifyToken, matchController.findMatch);
router.post('/skip', verifyToken, matchController.skipMatch);

module.exports = router;
EOF

cat > routes/calls.js << 'EOF'
const express = require('express');
const router = express.Router();
const callController = require('../controllers/callController');
const { verifyToken, requirePremium } = require('../middleware/authMiddleware');

router.get('/history', verifyToken, requirePremium, callController.getCallHistory);
router.post('/log', verifyToken, callController.logCall);

module.exports = router;
EOF

cat > routes/moderation.js << 'EOF'
const express = require('express');
const router = express.Router();
const moderationController = require('../controllers/moderationController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/create', verifyToken, moderationController.reportUser);
router.get('/my-reports', verifyToken, moderationController.getMyReports);

module.exports = router;
EOF

# Create placeholder routes for subscriptions, payments, and admin
cat > routes/subscriptions.js << 'EOF'
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/plans', (req, res) => {
    res.json({ plans: [] });
});

module.exports = router;
EOF

cat > routes/payments.js << 'EOF'
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/create-order', verifyToken, (req, res) => {
    res.json({ message: 'Payment endpoint' });
});

module.exports = router;
EOF

cat > routes/admin.js << 'EOF'
const express = requireconst { verifyTokt router = express.Router();
const { requireAdmin } = require('../middleware/authMiddleware');

router.get('/dashboard/stats',router.get('/my-reports') => {
    res.json({ stats: {} });
});

modul
modports = router;
EOF

echo "✅ All backend files created successfully!"
