const nodemailer = require('nodemailer');

// Create transporter (using Gmail for demo - replace with your email service)
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'your-email@gmail.com',
      pass: process.env.EMAIL_PASS || 'your-app-password'
    },
    // Anti-spam headers
    headers: {
      'X-Mailer': 'Crypto Tracker',
      'X-Priority': '3',
      'X-MSMail-Priority': 'Normal',
      'Importance': 'Normal'
    },
    // Additional options to avoid spam
    tls: {
      rejectUnauthorized: false
    },
    pool: true,
    maxConnections: 1,
    maxMessages: 3,
    rateDelta: 20000,
    rateLimit: 5
  });
};

// Send password reset email
const sendPasswordResetEmail = async (email, resetToken) => {
  try {
    const transporter = createTransporter();
    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: {
        name: 'Crypto Tracker Support',
        address: process.env.EMAIL_USER || 'your-email@gmail.com'
      },
      to: email,
      subject: 'Reset Your Password - Crypto Tracker Account',
      // Anti-spam headers
      headers: {
        'X-Mailer': 'Crypto Tracker',
        'X-Priority': '3',
        'X-MSMail-Priority': 'Normal',
        'Importance': 'Normal',
        'List-Unsubscribe': '<mailto:unsubscribe@cryptotracker.com>',
        'Return-Path': process.env.EMAIL_USER || 'your-email@gmail.com'
      },
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f8f9fa;
            }
            .container {
              background: white;
              border-radius: 8px;
              padding: 40px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              color: #3b82f6;
              margin-bottom: 10px;
            }
            .title {
              font-size: 20px;
              color: #1f2937;
              margin-bottom: 20px;
            }
            .content {
              margin-bottom: 30px;
            }
            .button {
              display: inline-block;
              background-color: #3b82f6;
              color: white;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 20px 0;
            }
            .button:hover {
              background-color: #2563eb;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              font-size: 14px;
              color: #6b7280;
            }
            .warning {
              background-color: #fef3cd;
              border: 1px solid #fecaca;
              border-radius: 4px;
              padding: 12px;
              margin: 20px 0;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">📊 Crypto Tracker</div>
              <h1 class="title">Password Reset Request</h1>
            </div>
            
            <div class="content">
              <p>Dear User,</p>
              <p>We received a request to reset your password for your Crypto Tracker account.</p>
              <p>To reset your password, please click the button below:</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </div>
              
              <div class="warning">
                <strong>Important:</strong> This link will expire in 1 hour. If you did not request this password reset, please ignore this email.
              </div>
              
              <p>If the button above doesn't work, copy and paste this link into your browser:</p>
              <div style="word-break: break-all; background-color: #f3f4f6; padding: 12px; border-radius: 4px; font-family: monospace; font-size: 12px; margin: 10px 0;">
                ${resetUrl}
              </div>
              
              <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
                This email was sent from Crypto Tracker. If you have any questions, please contact our support team.
              </p>
            </div>
            
            <div class="footer">
              <p>This email was sent from Crypto Tracker. If you have any questions, please contact our support team.</p>
              <p>© 2024 Crypto Tracker. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Reset Your Password - Crypto Tracker Account
        
        Dear User,
        
        We received a request to reset your password for your Crypto Tracker account.
        
        To reset your password, please click the link below:
        ${resetUrl}
        
        Important: This link will expire in 1 hour. If you did not request this password reset, please ignore this email.
        
        If you have any questions, please contact our support team.
        
        Best regards,
        Crypto Tracker Support Team
        
        ---
        This email was sent from Crypto Tracker. If you have any questions, please contact our support team.
      `
    };

    // Add small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await transporter.sendMail(mailOptions);
    console.log('Password reset email sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
};

// Send welcome email for Google login
const sendWelcomeEmail = async (email, username) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: {
        name: 'Crypto Tracker',
        address: process.env.EMAIL_USER || 'your-email@gmail.com'
      },
      to: email,
      subject: 'Welcome to Crypto Tracker!',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Crypto Tracker</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f8f9fa;
            }
            .container {
              background: white;
              border-radius: 8px;
              padding: 40px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              color: #3b82f6;
              margin-bottom: 10px;
            }
            .title {
              font-size: 20px;
              color: #1f2937;
              margin-bottom: 20px;
            }
            .content {
              margin-bottom: 30px;
            }
            .button {
              display: inline-block;
              background-color: #3b82f6;
              color: white;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 20px 0;
            }
            .button:hover {
              background-color: #2563eb;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              font-size: 14px;
              color: #6b7280;
            }
            .features {
              background-color: #f8fafc;
              border-radius: 6px;
              padding: 20px;
              margin: 20px 0;
            }
            .feature-item {
              margin: 10px 0;
              padding-left: 20px;
              position: relative;
            }
            .feature-item::before {
              content: "✓";
              position: absolute;
              left: 0;
              color: #10b981;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">📊 Crypto Tracker</div>
              <h1 class="title">Welcome to Crypto Tracker!</h1>
            </div>
            
            <div class="content">
              <p>Hi ${username},</p>
              <p>Welcome to Crypto Tracker! You've successfully signed up with Google and can now start tracking your cryptocurrency investments.</p>
              
              <div class="features">
                <h3 style="margin-top: 0;">What you can do:</h3>
                <div class="feature-item">Track your cryptocurrency portfolio</div>
                <div class="feature-item">Monitor real-time prices</div>
                <div class="feature-item">View profit/loss analytics</div>
                <div class="feature-item">Add multiple cryptocurrencies</div>
                <div class="feature-item">View price history charts</div>
                <div class="feature-item">Reset password via email</div>
              </div>
              
              <div style="text-align: center;">
                <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/dashboard" class="button">Go to Dashboard</a>
              </div>
              
              <p>If you have any questions or need help getting started, feel free to reach out to our support team.</p>
            </div>
            
            <div class="footer">
              <p>Happy trading!</p>
              <p>© 2024 Crypto Tracker. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Welcome to Crypto Tracker!
        
        Hi ${username},
        
        Welcome to Crypto Tracker! You've successfully signed up with Google.
        
        You can now:
        - Track your cryptocurrency portfolio
        - Monitor real-time prices
        - View profit/loss analytics
        - Add multiple cryptocurrencies
        - View price history charts
        - Reset password via email
        
        Get started: ${process.env.CLIENT_URL || 'http://localhost:3000'}/dashboard
        
        Happy trading!
        Crypto Tracker Team
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Welcome email sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendWelcomeEmail
};
