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
