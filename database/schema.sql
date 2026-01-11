-- Random Stranger Video Calling App Database Schema
-- MySQL/MariaDB

CREATE DATABASE IF NOT EXISTS u511507062_videocallapp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE u511507062_videocallapp;

-- Users Table
CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    phone VARCHAR(20) UNIQUE,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    name VARCHAR(100),
    age INT UNSIGNED,
    gender ENUM('male', 'female', 'other') DEFAULT NULL,
    region VARCHAR(100),
    avatar_url VARCHAR(500),
    bio TEXT,
    
    -- Premium & Subscription
    is_premium BOOLEAN DEFAULT FALSE,
    subscription_expires_at DATETIME NULL,
    coins_balance INT UNSIGNED DEFAULT 0,
    
    -- Moderation & Security
    is_banned BOOLEAN DEFAULT FALSE,
    ban_reason TEXT,
    banned_until DATETIME NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    age_verified BOOLEAN DEFAULT FALSE,
    
    -- Device & Security Tracking
    device_id VARCHAR(255),
    ip_address VARCHAR(45),
    last_ip_address VARCHAR(45),
    device_info JSON,
    
    -- Activity Tracking
    is_online BOOLEAN DEFAULT FALSE,
    last_active_at DATETIME,
    total_calls INT UNSIGNED DEFAULT 0,
    total_minutes INT UNSIGNED DEFAULT 0,
    
    -- Guest Mode
    is_guest BOOLEAN DEFAULT FALSE,
    guest_token VARCHAR(255) UNIQUE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_phone (phone),
    INDEX idx_email (email),
    INDEX idx_is_online (is_online),
    INDEX idx_is_banned (is_banned),
    INDEX idx_device_id (device_id),
    INDEX idx_ip_address (ip_address)
) ENGINE=InnoDB;

-- Calls Table
CREATE TABLE calls (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    caller_id BIGINT UNSIGNED NOT NULL,
    receiver_id BIGINT UNSIGNED NOT NULL,
    
    -- Call Details
    started_at DATETIME NOT NULL,
    ended_at DATETIME NULL,
    duration_seconds INT UNSIGNED DEFAULT 0,
    
    -- Call Quality & Feedback
    call_quality_rating TINYINT UNSIGNED,
    caller_rating TINYINT UNSIGNED,
    receiver_rating TINYINT UNSIGNED,
    
    -- Call End Info
    ended_by ENUM('caller', 'receiver', 'system', 'timeout') DEFAULT NULL,
    disconnect_reason VARCHAR(100),
    
    -- WebRTC Stats (optional)
    connection_stats JSON,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (caller_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_caller (caller_id),
    INDEX idx_receiver (receiver_id),
    INDEX idx_started_at (started_at),
    INDEX idx_duration (duration_seconds)
) ENGINE=InnoDB;

-- Reports Table
CREATE TABLE reports (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    reporter_id BIGINT UNSIGNED NOT NULL,
    reported_user_id BIGINT UNSIGNED NOT NULL,
    call_id BIGINT UNSIGNED NULL,
    
    -- Report Details
    reason ENUM('inappropriate_content', 'harassment', 'spam', 'underage', 'nudity', 'violence', 'other') NOT NULL,
    description TEXT,
    evidence_url VARCHAR(500),
    screenshot_url VARCHAR(500),
    
    -- Review Status
    status ENUM('pending', 'under_review', 'actioned', 'dismissed') DEFAULT 'pending',
    reviewed_by BIGINT UNSIGNED NULL,
    reviewed_at DATETIME NULL,
    action_taken ENUM('warning', 'temporary_ban', 'permanent_ban', 'no_action') DEFAULT NULL,
    admin_notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reported_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (call_id) REFERENCES calls(id) ON DELETE SET NULL,
    
    INDEX idx_reporter (reporter_id),
    INDEX idx_reported_user (reported_user_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB;

-- Subscriptions Table
CREATE TABLE subscriptions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    
    -- Plan Details
    plan_type ENUM('basic', 'premium', 'vip') NOT NULL,
    plan_name VARCHAR(100) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Subscription Period
    started_at DATETIME NOT NULL,
    expires_at DATETIME NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    auto_renew BOOLEAN DEFAULT FALSE,
    
    -- Payment Reference
    payment_id BIGINT UNSIGNED NULL,
    
    -- Features (JSON for flexibility)
    features JSON,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_user (user_id),
    INDEX idx_expires_at (expires_at),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB;

-- Payments Table
CREATE TABLE payments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    
    -- Payment Details
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method ENUM('card', 'upi', 'wallet', 'netbanking', 'in_app_purchase') NOT NULL,
    
    -- Transaction Info
    transaction_id VARCHAR(255) UNIQUE NOT NULL,
    gateway_transaction_id VARCHAR(255),
    status ENUM('pending', 'success', 'failed', 'refunded') DEFAULT 'pending',
    
    -- Gateway Response
    gateway_response JSON,
    
    -- Purpose
    purpose ENUM('subscription', 'coins', 'premium_feature') NOT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_user (user_id),
    INDEX idx_transaction_id (transaction_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB;

-- Blocked Users Table
CREATE TABLE blocked_users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    blocker_id BIGINT UNSIGNED NOT NULL,
    blocked_id BIGINT UNSIGNED NOT NULL,
    
    reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (blocker_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (blocked_id) REFERENCES users(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_block (blocker_id, blocked_id),
    INDEX idx_blocker (blocker_id),
    INDEX idx_blocked (blocked_id)
) ENGINE=InnoDB;

-- App Settings Table
CREATE TABLE app_settings (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description TEXT,
    
    updated_by BIGINT UNSIGNED NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_setting_key (setting_key)
) ENGINE=InnoDB;

-- Insert Default Settings
INSERT INTO app_settings (setting_key, setting_value, setting_type, description) VALUES
('max_call_duration_free', '300', 'number', 'Maximum call duration for free users in seconds'),
('max_call_duration_premium', '0', 'number', 'Maximum call duration for premium users (0 = unlimited)'),
('daily_call_limit_free', '10', 'number', 'Daily call limit for free users'),
('daily_call_limit_premium', '0', 'number', 'Daily call limit for premium users (0 = unlimited)'),
('enable_gender_filter', 'true', 'boolean', 'Enable gender filter feature'),
('enable_region_filter', 'true', 'boolean', 'Enable region filter feature'),
('gender_filter_premium_only', 'true', 'boolean', 'Gender filter available only for premium users'),
('region_filter_premium_only', 'false', 'boolean', 'Region filter available only for premium users'),
('min_age_requirement', '18', 'number', 'Minimum age requirement'),
('enable_age_verification', 'true', 'boolean', 'Enable age verification'),
('enable_screenshot_prevention', 'true', 'boolean', 'Enable screenshot prevention'),
('auto_ban_report_threshold', '5', 'number', 'Auto-ban user after this many reports'),
('maintenance_mode', 'false', 'boolean', 'Enable maintenance mode'),
('app_version_android', '1.0.0', 'string', 'Current Android app version'),
('force_update_android', 'false', 'boolean', 'Force update for Android'),
('stun_servers', '["stun:stun.l.google.com:19302"]', 'json', 'STUN servers configuration'),
('turn_servers', '[]', 'json', 'TURN servers configuration');

-- Audit Logs Table
CREATE TABLE audit_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NULL,
    admin_id BIGINT UNSIGNED NULL,
    
    -- Action Details
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id BIGINT UNSIGNED,
    details JSON,
    
    -- Request Info
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user (user_id),
    INDEX idx_admin (admin_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB;

-- OTP Verification Table
CREATE TABLE otp_verifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    phone VARCHAR(20),
    email VARCHAR(255),
    otp_code VARCHAR(6) NOT NULL,
    
    -- Verification Status
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at DATETIME NULL,
    
    -- Expiry & Attempts
    expires_at DATETIME NOT NULL,
    attempts INT UNSIGNED DEFAULT 0,
    max_attempts INT UNSIGNED DEFAULT 3,
    
    -- Purpose
    purpose ENUM('login', 'registration', 'password_reset') DEFAULT 'login',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_phone (phone),
    INDEX idx_email (email),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB;

-- Admin Users Table
CREATE TABLE admin_users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    
    -- Role & Permissions
    role ENUM('super_admin', 'admin', 'moderator') DEFAULT 'moderator',
    permissions JSON,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at DATETIME NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_username (username),
    INDEX idx_email (email)
) ENGINE=InnoDB;

-- Notifications Table
CREATE TABLE notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    
    -- Notification Details
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('match_found', 'system_alert', 'account_action', 'promotion', 'other') NOT NULL,
    
    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    read_at DATETIME NULL,
    
    -- Additional Data
    data JSON,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_user (user_id),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB;

-- Matchmaking Queue (for Redis alternative or backup)
CREATE TABLE matchmaking_queue (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    
    -- Filter Preferences
    gender_filter ENUM('male', 'female', 'any') DEFAULT 'any',
    region_filter VARCHAR(100),
    
    -- Queue Status
    status ENUM('waiting', 'matched', 'expired') DEFAULT 'waiting',
    matched_with BIGINT UNSIGNED NULL,
    
    -- Timestamps
    joined_at DATETIME NOT NULL,
    expires_at DATETIME NOT NULL,
    matched_at DATETIME NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_user (user_id),
    INDEX idx_status (status),
    INDEX idx_joined_at (joined_at),
    INDEX idx_gender_filter (gender_filter),
    INDEX idx_region_filter (region_filter)
) ENGINE=InnoDB;
