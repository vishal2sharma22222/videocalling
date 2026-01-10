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
