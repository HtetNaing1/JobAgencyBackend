const nodemailer = require('nodemailer');

let transporter = null;

/**
 * Create email transporter based on environment
 */
const createTransporter = () => {
  // Return cached transporter if already created
  if (transporter) {
    return transporter;
  }

  // Check if email is configured
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('⚠️  Email not configured: SMTP_USER and SMTP_PASS are required');
    return null;
  }

  // For production with custom SMTP host
  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      // Production optimizations
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
    });
  } else {
    // Default: Gmail configuration
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Verify transporter configuration
  transporter.verify((error) => {
    if (error) {
      console.error('❌ Email transporter verification failed:', error.message);
      transporter = null;
    } else {
      console.log('✅ Email service is ready');
    }
  });

  return transporter;
};

/**
 * Send an email
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text content
 * @param {string} [options.html] - HTML content (optional)
 * @param {number} [retries=2] - Number of retry attempts
 */
const sendEmail = async (options, retries = 2) => {
  const emailTransporter = createTransporter();

  if (!emailTransporter) {
    const error = new Error('Email service not configured');
    error.code = 'EMAIL_NOT_CONFIGURED';
    throw error;
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || `"JobAgency" <${process.env.SMTP_USER}>`,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  };

  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const info = await emailTransporter.sendMail(mailOptions);
      console.log(`📧 Email sent to ${options.to}: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      lastError = error;
      console.error(`📧 Email attempt ${attempt + 1} failed:`, error.message);

      // Don't retry for certain errors
      if (error.code === 'EAUTH' || error.responseCode === 550) {
        break;
      }

      // Wait before retrying (exponential backoff)
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
  }

  // All retries failed
  console.error(`📧 Failed to send email to ${options.to} after ${retries + 1} attempts`);
  throw lastError;
};

/**
 * Send password reset email
 */
const sendPasswordResetEmail = async (email, resetUrl, userName = 'User') => {
  const subject = 'Password Reset Request - JobAgency';

  const text = `
Hello ${userName},

You requested to reset your password for your JobAgency account.

Click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour.

If you didn't request this password reset, please ignore this email or contact support if you have concerns.

Best regards,
The JobAgency Team
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">JobAgency</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <h2 style="color: #1f2937; margin-top: 0;">Password Reset Request</h2>

    <p>Hello ${userName},</p>

    <p>You requested to reset your password for your JobAgency account.</p>

    <p>Click the button below to reset your password:</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Reset Password</a>
    </div>

    <p style="color: #6b7280; font-size: 14px;">This link will expire in <strong>1 hour</strong>.</p>

    <p style="color: #6b7280; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
    <p style="color: #2563eb; font-size: 14px; word-break: break-all;">${resetUrl}</p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">
      If you didn't request this password reset, please ignore this email or contact support if you have concerns.
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p style="margin: 0;">&copy; ${new Date().getFullYear()} JobAgency. All rights reserved.</p>
  </div>
</body>
</html>
  `.trim();

  return sendEmail({
    to: email,
    subject,
    text,
    html,
  });
};

/**
 * Send welcome email
 */
const sendWelcomeEmail = async (email, userName, role) => {
  const subject = 'Welcome to JobAgency!';

  const roleMessages = {
    jobseeker: 'Start exploring thousands of job opportunities and take the next step in your career.',
    employer: 'Post your job openings and find the perfect candidates for your team.',
    training_center: 'Showcase your courses and help professionals develop their skills.',
  };

  const text = `
Welcome to JobAgency, ${userName}!

Your account has been created successfully.

${roleMessages[role] || 'Welcome to our platform!'}

Get started by completing your profile to make the most of our platform.

Best regards,
The JobAgency Team
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to JobAgency!</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <h2 style="color: #1f2937; margin-top: 0;">Hello ${userName}! 👋</h2>

    <p>Your account has been created successfully.</p>

    <p>${roleMessages[role] || 'Welcome to our platform!'}</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Get Started</a>
    </div>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="color: #6b7280; font-size: 14px;">
      Need help? Feel free to reach out to our support team.
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p style="margin: 0;">&copy; ${new Date().getFullYear()} JobAgency. All rights reserved.</p>
  </div>
</body>
</html>
  `.trim();

  return sendEmail({
    to: email,
    subject,
    text,
    html,
  });
};

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
};
