const User = require('../models/userAuth');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
require('dotenv').config();


exports.getForgotPassword = (req, res) => {
    res.render('forgot-password', { message: null });
};


exports.postForgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.render('forgot-password', { message: 'No account found with this email.' });
        }

        // Generate a token
        const token = crypto.randomBytes(32).toString('hex');
        const expireTime = Date.now() + 3600000; // 1 hour

        // Save token and expiry in user document
        user.resetPasswordToken = token;
        user.resetPasswordExpires = expireTime;
        await user.save();

        // Configure Nodemailer
        const transporter = nodemailer.createTransport({
            service: 'Gmail', // or any SMTP
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        // Email content
        const resetURL = `${req.protocol}://${req.get('host')}/reset-password/${token}`;
        const mailOptions = {
            from: `"SmartGuide" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: 'Password Reset Request',
            html: `
                <p>Hello ${user.name},</p>
                <p>You requested a password reset. Click the link below to set a new password:</p>
                <a href="${resetURL}" style="background: #007bff; color: #fff; padding: 10px 15px; border-radius: 5px; text-decoration: none;">Reset Password</a>
                <p>This link will expire in 1 hour.</p>
            `,
        };

        await transporter.sendMail(mailOptions);

        res.render('forgot-password', { message: 'Password reset link has been sent to your email.' });

    } catch (err) {
        console.error(err);
        res.status(500).render('forgot-password', { message: 'Error sending reset email. Try again later.' });
    }
};

// GET Reset Password Page
exports.getResetPassword = async (req, res) => {
    const { token } = req.params;
    const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
        return res.send('Password reset token is invalid or has expired.');
    }

    res.render('reset-page', { token, message: null });
};

// POST Reset Password
exports.postResetPassword = async (req, res) => {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
        return res.render('reset-page', { token, message: 'Passwords do not match.' });
    }

    const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
        return res.send('Password reset token is invalid or has expired.');
    }

    user.password = password; // Make sure your User model hashes password before saving
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.send('Password has been reset successfully! You can now <a href="/login">login</a>.');
};
