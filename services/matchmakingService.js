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
