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

/**
 * Send email verification email
 */
const sendVerificationEmail = async (email, verificationUrl, userName = 'User') => {
  const subject = 'Verify Your Email - JobAgency';

  const text = `
Hello ${userName},

Please verify your email address to complete your JobAgency registration.

Click the link below to verify your email:
${verificationUrl}

This link will expire in 24 hours.

If you didn't create an account on JobAgency, please ignore this email.

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
    <h2 style="color: #1f2937; margin-top: 0;">Verify Your Email Address</h2>

    <p>Hello ${userName},</p>

    <p>Thank you for registering with JobAgency! Please verify your email address to complete your account setup.</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Verify Email</a>
    </div>

    <p style="color: #6b7280; font-size: 14px;">This link will expire in <strong>24 hours</strong>.</p>

    <p style="color: #6b7280; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
    <p style="color: #2563eb; font-size: 14px; word-break: break-all;">${verificationUrl}</p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">
      If you didn't create an account on JobAgency, please ignore this email.
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
 * Send application status update email
 */
const sendApplicationStatusEmail = async (email, userName, jobTitle, companyName, status, jobUrl) => {
  const statusMessages = {
    reviewed: {
      title: 'Application Reviewed',
      message: 'Your application has been reviewed by the employer.',
      color: '#3b82f6',
      icon: '👀'
    },
    shortlisted: {
      title: 'Congratulations! You\'ve Been Shortlisted',
      message: 'Great news! You\'ve been shortlisted for this position. The employer may contact you soon for next steps.',
      color: '#10b981',
      icon: '⭐'
    },
    interview: {
      title: 'Interview Scheduled',
      message: 'You\'ve been selected for an interview! Check your dashboard for interview details.',
      color: '#8b5cf6',
      icon: '📅'
    },
    rejected: {
      title: 'Application Update',
      message: 'Unfortunately, the employer has decided to move forward with other candidates. Don\'t be discouraged - keep applying!',
      color: '#6b7280',
      icon: '📋'
    },
    hired: {
      title: 'Congratulations! You\'re Hired!',
      message: 'Amazing news! You\'ve been selected for this position. The employer will be in touch with onboarding details.',
      color: '#10b981',
      icon: '🎉'
    }
  };

  const statusInfo = statusMessages[status] || {
    title: 'Application Status Update',
    message: `Your application status has been updated to: ${status}`,
    color: '#6b7280',
    icon: '📬'
  };

  const subject = `${statusInfo.icon} ${statusInfo.title} - ${jobTitle} at ${companyName}`;

  const text = `
Hello ${userName},

${statusInfo.title}

Job: ${jobTitle}
Company: ${companyName}

${statusInfo.message}

View your application: ${jobUrl}

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
    <div style="text-align: center; margin-bottom: 20px;">
      <span style="font-size: 48px;">${statusInfo.icon}</span>
    </div>

    <h2 style="color: ${statusInfo.color}; margin-top: 0; text-align: center;">${statusInfo.title}</h2>

    <p>Hello ${userName},</p>

    <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 0 0 8px 0;"><strong>Position:</strong> ${jobTitle}</p>
      <p style="margin: 0;"><strong>Company:</strong> ${companyName}</p>
    </div>

    <p>${statusInfo.message}</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${jobUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">View Application</a>
    </div>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">
      This is an automated notification from JobAgency regarding your job application.
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
 * Send interview scheduled email
 */
const sendInterviewEmail = async (email, userName, jobTitle, companyName, interviewDate, location, meetingLink, notes) => {
  const subject = `📅 Interview Scheduled - ${jobTitle} at ${companyName}`;
  const formattedDate = new Date(interviewDate).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const text = `
Hello ${userName},

Great news! An interview has been scheduled for your application.

Job: ${jobTitle}
Company: ${companyName}
Date & Time: ${formattedDate}
${location ? `Location: ${location}` : ''}
${meetingLink ? `Meeting Link: ${meetingLink}` : ''}
${notes ? `Notes: ${notes}` : ''}

Please make sure to:
- Be punctual
- Prepare relevant questions about the role
- Have your resume ready

Best of luck with your interview!

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
  <div style="background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Interview Scheduled!</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <span style="font-size: 48px;">📅</span>
    </div>

    <p>Hello ${userName},</p>

    <p>Great news! An interview has been scheduled for your application.</p>

    <div style="background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%); border-radius: 12px; padding: 24px; margin: 20px 0; border-left: 4px solid #8b5cf6;">
      <p style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #5b21b6;">${jobTitle}</p>
      <p style="margin: 0 0 16px 0; color: #6b7280;">${companyName}</p>

      <div style="display: flex; align-items: center; margin-bottom: 12px;">
        <span style="font-size: 20px; margin-right: 12px;">🗓️</span>
        <div>
          <p style="margin: 0; font-weight: 600; color: #1f2937;">${formattedDate}</p>
        </div>
      </div>

      ${location ? `
      <div style="display: flex; align-items: center; margin-bottom: 12px;">
        <span style="font-size: 20px; margin-right: 12px;">📍</span>
        <p style="margin: 0; color: #4b5563;">${location}</p>
      </div>
      ` : ''}

      ${meetingLink ? `
      <div style="display: flex; align-items: center; margin-bottom: 12px;">
        <span style="font-size: 20px; margin-right: 12px;">💻</span>
        <a href="${meetingLink}" style="color: #7c3aed; text-decoration: none;">Join Online Meeting</a>
      </div>
      ` : ''}

      ${notes ? `
      <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #ddd6fe;">
        <p style="margin: 0 0 4px 0; font-weight: 600; color: #5b21b6;">Notes from employer:</p>
        <p style="margin: 0; color: #4b5563;">${notes}</p>
      </div>
      ` : ''}
    </div>

    <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #92400e;">Preparation Tips:</p>
      <ul style="margin: 0; padding-left: 20px; color: #78350f;">
        <li>Be punctual - join/arrive 5-10 minutes early</li>
        <li>Prepare relevant questions about the role</li>
        <li>Have your resume ready to reference</li>
        <li>Research the company beforehand</li>
      </ul>
    </div>

    ${meetingLink ? `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${meetingLink}" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Join Meeting</a>
    </div>
    ` : ''}

    <p style="text-align: center; color: #059669; font-weight: 500;">Best of luck with your interview! 🍀</p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">
      This is an automated notification from JobAgency regarding your scheduled interview.
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
 * Send new application received email to employer
 */
const sendNewApplicationEmail = async (email, companyName, jobTitle, applicantName, applicationUrl) => {
  const subject = `📬 New Application - ${applicantName} applied for ${jobTitle}`;

  const text = `
Hello ${companyName},

You have received a new application for your job posting.

Position: ${jobTitle}
Applicant: ${applicantName}

Review the application: ${applicationUrl}

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
    <h1 style="color: white; margin: 0; font-size: 24px;">New Application Received</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <span style="font-size: 48px;">📬</span>
    </div>

    <p>Hello ${companyName},</p>

    <p>You have received a new application for your job posting.</p>

    <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #10b981;">
      <p style="margin: 0 0 8px 0;"><strong>Position:</strong> ${jobTitle}</p>
      <p style="margin: 0;"><strong>Applicant:</strong> ${applicantName}</p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${applicationUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Review Application</a>
    </div>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">
      This is an automated notification from JobAgency.
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
  sendVerificationEmail,
  sendApplicationStatusEmail,
  sendInterviewEmail,
  sendNewApplicationEmail,
};
