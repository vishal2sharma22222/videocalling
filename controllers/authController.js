const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { generateOTP, sendOTP } = require('../services/otpService');

// Send OTP for login/registration
exports.sendOTP = async (req, res) => {
    try {
        const { phone, email, purpose } = req.body;

        if (!phone && !email) {
            return res.status(400).json({ error: 'Phone or email is required' });
        }

        // Generate 6-digit OTP
        const otpCode = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Store OTP in database
        await db.query(
            `INSERT INTO otp_verifications (phone, email, otp_code, expires_at, purpose) 
             VALUES (?, ?, ?, ?, ?)`,
            [phone || null, email || null, otpCode, expiresAt, purpose || 'login']
        );

        // Send OTP via SMS or Email
        await sendOTP(phone || email, otpCode, phone ? 'sms' : 'email');

        res.json({
            message: 'OTP sent successfully',
            expiresIn: 600 // seconds
        });
    } catch (error) {
        console.error('Send OTP error:', error);
        res.status(500).json({ error: 'Failed to send OTP' });
    }
};

// Verify OTP and login/register
exports.verifyOTP = async (req, res) => {
    try {
        const { phone, email, otpCode, deviceId, deviceInfo } = req.body;

        if (!phone && !email) {
            return res.status(400).json({ error: 'Phone or email is required' });
        }

        if (!otpCode) {
            return res.status(400).json({ error: 'OTP code is required' });
        }

        // Verify OTP
        const [otpRecords] = await db.query(
            `SELECT * FROM otp_verifications 
             WHERE (phone = ? OR email = ?) 
             AND otp_code = ? 
             AND is_verified = FALSE 
             AND expires_at > NOW() 
             AND attempts < max_attempts
             ORDER BY created_at DESC 
             LIMIT 1`,
            [phone || null, email || null, otpCode]
        );

        if (otpRecords.length === 0) {
            // Increment attempts
            await db.query(
                `UPDATE otp_verifications 
                 SET attempts = attempts + 1 
                 WHERE (phone = ? OR email = ?) AND otp_code = ?`,
                [phone || null, email || null, otpCode]
            );

            return res.status(400).json({ error: 'Invalid or expired OTP' });
        }

        // Mark OTP as verified
        await db.query(
            'UPDATE otp_verifications SET is_verified = TRUE, verified_at = NOW() WHERE id = ?',
            [otpRecords[0].id]
        );

        // Check if user exists
        let [users] = await db.query(
            'SELECT * FROM users WHERE phone = ? OR email = ?',
            [phone || null, email || null]
        );

        let user;
        let isNewUser = false;

        if (users.length === 0) {
            // Create new user
            const [result] = await db.query(
                `INSERT INTO users (phone, email, device_id, device_info, ip_address, is_online) 
                 VALUES (?, ?, ?, ?, ?, TRUE)`,
                [phone || null, email || null, deviceId, JSON.stringify(deviceInfo), req.ip]
            );

            user = {
                id: result.insertId,
                phone,
                email,
                is_premium: false,
                is_guest: false
            };
            isNewUser = true;
        } else {
            user = users[0];

            // Update user's device and online status
            await db.query(
                `UPDATE users 
                 SET device_id = ?, device_info = ?, ip_address = ?, is_online = TRUE, last_active_at = NOW() 
                 WHERE id = ?`,
                [deviceId, JSON.stringify(deviceInfo), req.ip, user.id]
            );
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, role: 'user' },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        const refreshToken = jwt.sign(
            { userId: user.id },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
        );

        res.json({
            message: 'Login successful',
            token,
            refreshToken,
            user: {
                id: user.id,
                phone: user.phone,
                email: user.email,
                name: user.name,
                isPremium: user.is_premium,
                isNewUser
            }
        });
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({ error: 'Failed to verify OTP' });
    }
};

// Guest login
exports.guestLogin = async (req, res) => {
    try {
        const { deviceId, deviceInfo, name } = req.body;

        // Generate guest token
        const guestToken = require('uuid').v4();

        // Create guest user
        const [result] = await db.query(
            `INSERT INTO users (is_guest, guest_token, name, device_id, device_info, ip_address, is_online) 
             VALUES (TRUE, ?, ?, ?, ?, ?, TRUE)`,
            [guestToken, name || 'Stranger', deviceId, JSON.stringify(deviceInfo), req.ip]
        );

        const userId = result.insertId;

        // Generate JWT token
        const token = jwt.sign(
            { userId, role: 'guest' },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Guest login successful',
            token,
            user: {
                id: userId,
                isGuest: true,
                guestToken
            }
        });
    } catch (error) {
        console.error('Guest login error:', error);
        res.status(500).json({ error: 'Failed to create guest account' });
    }
};

// Logout
exports.logout = async (req, res) => {
    try {
        const { userId } = req.user;

        // Update user's online status
        await db.query(
            'UPDATE users SET is_online = FALSE, last_active_at = NOW() WHERE id = ?',
            [userId]
        );

        res.json({ message: 'Logout successful' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Failed to logout' });
    }
};

// Refresh token
exports.refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token is required' });
        }

        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        // Generate new access token
        const newToken = jwt.sign(
            { userId: decoded.userId, role: 'user' },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        res.json({ token: newToken });
    } catch (error) {
        res.status(401).json({ error: 'Invalid refresh token' });
    }
};

// Email registration
exports.register = async (req, res) => {
    try {
        const { name, email, password, deviceId, deviceInfo } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Check if user already exists
        const [existingUsers] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create user
        const [result] = await db.query(
            `INSERT INTO users (name, email, password_hash, device_id, device_info, ip_address, is_online) 
             VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
            [name || 'User', email, passwordHash, deviceId, JSON.stringify(deviceInfo), req.ip]
        );

        const userId = result.insertId;

        // Generate JWT tokens
        const token = jwt.sign({ userId, role: 'user' }, process.env.JWT_SECRET, { expiresIn: '24h' });

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: { id: userId, name, email }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
};

// Email login
exports.login = async (req, res) => {
    try {
        const { email, password, deviceId, deviceInfo } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = users[0];

        // Check password
        if (!user.password_hash) {
            return res.status(401).json({ error: 'Please use OTP to login' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Update online status
        await db.query(
            'UPDATE users SET is_online = TRUE, device_id = ?, device_info = ?, last_active_at = NOW() WHERE id = ?',
            [deviceId, JSON.stringify(deviceInfo), user.id]
        );

        // Generate JWT tokens
        const token = jwt.sign({ userId: user.id, role: 'user' }, process.env.JWT_SECRET, { expiresIn: '24h' });

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                isPremium: user.is_premium
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
};
