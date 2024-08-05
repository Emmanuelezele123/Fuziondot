const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const { error } = require('console');
const router = express.Router();
require('dotenv').config();

// SMTP configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: {
    // do not fail on invalid certs
    rejectUnauthorized: false
},
  logger:true,  // Add this line to enable logging
  debug: true  
});

// Register
router.post('/register', async (req, res) => {
  const { firstname,lastname, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new User({ firstname,lastname, email, password: hashedPassword });
    await user.save();

    // Send confirmation email
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const url = `http://${req.headers.host}/api/auth/confirm/${token}`;

    await transporter.sendMail({
      from: '"Fuziondot" <noreply@fuziondot.com>',
      to: user.email,
      subject: 'Confirm your email',
      html: `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Email Confirmation</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            color: #333;
            line-height: 1.6;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
          }
          .container {
            width: 100%;
            max-width: 600px;
            margin: 0 auto;
            background: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            padding-bottom: 20px;
          }
          .header img {
            max-width: 100px;
          }
          .content {
            padding: 20px;
            text-align: center;
          }
          .content h1 {
            color: #333;
          }
          .button {
            display: inline-block;
            padding: 10px 20px;
            margin: 20px 0;
            font-size: 16px;
            font-weight: bold;
            color: #fff;
            background-color: #6C4DD6;
            text-decoration: none;
            border-radius: 5px;
          }
          .footer {
            text-align: center;
            padding: 10px;
            font-size: 14px;
            color: #777;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="https://res.cloudinary.com/ddaodj62p/image/upload/v1722849025/logo_if1scv.jpg" alt="Company Logo"> <!-- Replace with your logo -->
          </div>
          <div class="content">
            <h1>Welcome to FuzionDot </h1>
            <p>Hello ${user.firstname},</p>
            <p>Thank you for registering with us. Please confirm your email address by clicking the button below:</p>
            <a href="${url}" class="button">Confirm Your Email</a>
            <p>If you did not register for an account, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 Fuziondot. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
    });

    res.status(201).json({ message: 'User registered, please check your email to confirm your account' });
  } catch (err) {
    res.status(500).json({ message: err });
  }
});

// Confirm email
router.get('/confirm/:token', async (req, res) => {
  try {
    const decoded = jwt.verify(req.params.token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(400).json({ message: 'Invalid token' });
    }

    user.isVerified = true;
    await user.save();

    res.status(200).json({ message: 'Email confirmed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (!user.isVerified) {
      return res.status(400).json({ message: 'Email not verified' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({ token });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Request password reset
router.post('/reset-password', async (req, res) => {
    const { email } = req.body;
    try {
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ message: 'User not found' });
      }
  
      const token = crypto.randomBytes(32).toString('hex');
      user.resetToken = token;
      user.resetTokenExpiration = Date.now() + 3600000; // 1 hour
      await user.save();
  
      const resetUrl = `http://${req.headers.host}/api/auth/reset/${token}`;
  
      await transporter.sendMail({
        from: '"FuzionDot" <noreply@fuziondot.com>',
        to: user.email,
        subject: 'Password Reset Request',
        html: `<!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Password Reset Request</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              color: #333;
              line-height: 1.6;
              margin: 0;
              padding: 0;
              background-color: #f4f4f4;
            }
            .container {
              width: 100%;
              max-width: 600px;
              margin: 0 auto;
              background: #fff;
              padding: 20px;
              border-radius: 8px;
              box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            }
            .header {
              text-align: center;
              padding-bottom: 20px;
            }
            .header img {
              max-width: 100px;
            }
            .content {
              padding: 20px;
              text-align: center;
            }
            .content h1 {
              color: #333;
            }
            .button {
              display: inline-block;
              padding: 10px 20px;
              margin: 20px 0;
              font-size: 16px;
              font-weight: bold;
              color: #fff;
              background-color: #6C4DD6;
              text-decoration: none;
              border-radius: 5px;
            }
            .footer {
              text-align: center;
              padding: 10px;
              font-size: 14px;
              color: #777;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="https://res.cloudinary.com/ddaodj62p/image/upload/v1722849025/logo_if1scv.jpg" alt="Company Logo"> <!-- Replace with your logo -->
            </div>
            <div class="content">
              <h1>Password Reset Request</h1>
              <p>Hello ${user.firstname},</p>
              <p>We received a request to reset your password. Please click the button below to set a new password:</p>
              <a href="${resetUrl}" class="button">Reset Password</a>
              <p>If you did not request a password reset, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>&copy; 2024 FuzionDot. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
      });
  
      res.status(200).json({ message: 'Password reset email sent' });
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Reset password
  router.post('/reset/:token', async (req, res) => {
    const { password } = req.body;
    try {
      const user = await User.findOne({
        resetToken: req.params.token,
        resetTokenExpiration: { $gt: Date.now() }
      });
      if (!user) {
        return res.status(400).json({ message: 'Invalid or expired token' });
      }
  
      user.password = await bcrypt.hash(password, 12);
      user.resetToken = undefined;
      user.resetTokenExpiration = undefined;
      await user.save();
  
      res.status(200).json({ message: 'Password reset successful' });
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

module.exports = router;
