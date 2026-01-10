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
