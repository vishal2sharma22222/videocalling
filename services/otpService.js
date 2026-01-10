const twilio = require('twilio');
const nodemailer = require('nodemailer');

// Generate random OTP
exports.generateOTP = () => {
    const length = parseInt(process.env.OTP_LENGTH) || 6;
    return Math.floor(Math.random() * Math.pow(10, length)).toString().padStart(length, '0');
};

// Send OTP via SMS (Twilio)
const sendSMS = async (phone, otpCode) => {
    try {
        const client = twilio(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
        );
        
        await client.messages.create({
            body: `Your verification code is: ${otpCode}. Valid for 10 minutes.`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phone
        });
        
        return true;
    } catch (error) {
        console.error('SMS sending error:', error);
        throw error;
    }
};

// Send OTP via Email
const sendEmail = async (email, otpCode) => {
    try {
        const transporter = nodemailer.createTransporter({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD
            }
        });
        
        await transporter.sendMail({
            from: process.env.SMTP_FROM,
            to: email,
            subject: 'Your Verification Code',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2>Verification Code</h2>
                    <p>Your verification code is:</p>
                    <h1 style="color: #4CAF50; font-size: 32px; letter-spacing: 5px;">${otpCode}</h1>
                    <p>This code will expire in 10 minutes.</p>
                    <p style="color: #666; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
                </div>
            `
        });
        
        return true;
    } catch (error) {
        console.error('Email sending error:', error);
        throw error;
    }
};

// Main send OTP function
exports.sendOTP = async (recipient, otpCode, method = 'sms') => {
    if (method === 'sms') {
        return await sendSMS(recipient, otpCode);
    } else {
        return await sendEmail(recipient, otpCode);
    }
};
