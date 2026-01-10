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
