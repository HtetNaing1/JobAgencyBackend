const User = require('../models/User');
const JobSeekerProfile = require('../models/JobSeekerProfile');
const EmployerProfile = require('../models/EmployerProfile');
const TrainingCenterProfile = require('../models/TrainingCenterProfile');
const Job = require('../models/Job');
const Application = require('../models/Application');
const TrainingCourse = require('../models/TrainingCourse');
const CourseInquiry = require('../models/CourseInquiry');
const Notification = require('../models/Notification');
const { generateToken } = require('../utils/jwt');
const { validationResult } = require('express-validator');
const crypto = require('crypto');
const { sendPasswordResetEmail, sendVerificationEmail } = require('../utils/sendEmail');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create new user
    const user = await User.create({
      email,
      password,
      role: role || 'jobseeker'
    });

    // Send verification email if email service is configured
    const emailConfigured = !!(process.env.SENDGRID_API_KEY || process.env.BREVO_API_KEY);
    let emailSent = false;

    if (emailConfigured) {
      // Generate email verification token
      const verificationToken = user.getEmailVerificationToken();
      await user.save({ validateBeforeSave: false });

      // Create verification URL
      const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;

      // Always log verification URL for development
      console.log(`\n📧 Verification link for ${email}:`);
      console.log(`   ${verificationUrl}\n`);

      // Send verification email (non-blocking)
      try {
        await sendVerificationEmail(email, verificationUrl);
        emailSent = true;
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError.message);
        // User can still use the console-logged URL
      }
    } else {
      // Auto-verify if email not configured
      user.isVerified = true;
      await user.save({ validateBeforeSave: false });
    }

    res.status(201).json({
      success: true,
      message: emailSent
        ? 'Registration successful. Please check your email to verify your account.'
        : 'Registration successful.',
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support.'
      });
    }

    // Check if email is verified (skip if email service not configured)
    const emailRequired = process.env.REQUIRE_EMAIL_VERIFICATION === 'true';
    if (emailRequired && !user.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in. Check your inbox for the verification link.',
        needsVerification: true,
        email: user.email
      });
    }

    // Generate token
    const token = generateToken(user._id, user.role);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Logout user (client-side token removal)
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
};

// @desc    Forgot password - Generate reset token
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email address'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Don't reveal if user exists or not for security
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent'
      });
    }

    // Generate reset token
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    try {
      // Send password reset email
      await sendPasswordResetEmail(user.email, resetUrl);

      res.status(200).json({
        success: true,
        message: 'Password reset email has been sent to your email address'
      });
    } catch (emailError) {
      // If email fails, clear the reset token
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      console.error('Email send error:', emailError);
      res.status(500).json({
        success: false,
        message: 'Email could not be sent. Please try again later.'
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing password reset request'
    });
  }
};

// @desc    Reset password using token
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide token and new password'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters'
      });
    }

    // Hash the token to compare with stored hash
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Set new password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting password'
    });
  }
};

// @desc    Change password for logged-in user
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current password and new password'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters'
      });
    }

    // Get user with password
    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Check if new password is same as current
    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing password'
    });
  }
};

// @desc    Delete user account
// @route   DELETE /api/auth/delete-account
// @access  Private
exports.deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your password to confirm account deletion'
      });
    }

    // Get user with password
    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password'
      });
    }

    // Handle cascade deletion and notifications based on user role
    const userId = req.user.id;
    const userRole = user.role;

    if (userRole === 'jobseeker') {
      // Get job seeker profile for name
      const profile = await JobSeekerProfile.findOne({ user: userId });
      const seekerName = profile ? `${profile.firstName} ${profile.lastName}` : 'A job seeker';

      // Get all applications to notify employers
      const applications = await Application.find({ jobSeeker: userId, status: { $nin: ['withdrawn', 'rejected', 'hired'] } })
        .populate('job', 'title')
        .populate('employer', '_id');

      // Create notifications for employers about withdrawn applications
      const employerNotifications = applications.map(app => ({
        recipient: app.employer._id,
        type: 'application_status',
        title: 'Application Withdrawn',
        message: `${seekerName} has withdrawn their application for "${app.job?.title || 'a position'}" as they have deleted their account.`,
        relatedJob: app.job?._id,
        relatedApplication: app._id
      }));

      if (employerNotifications.length > 0) {
        await Notification.insertMany(employerNotifications);
      }

      // Delete job seeker's data
      await Promise.all([
        JobSeekerProfile.deleteOne({ user: userId }),
        Application.deleteMany({ jobSeeker: userId }),
        CourseInquiry.deleteMany({ inquirer: userId }),
        Notification.deleteMany({ recipient: userId })
      ]);

    } else if (userRole === 'employer') {
      // Get employer profile for company name
      const profile = await EmployerProfile.findOne({ user: userId });
      const companyName = profile?.companyName || 'A company';

      // Get all jobs and their applications
      const jobs = await Job.find({ employer: userId });
      const jobIds = jobs.map(job => job._id);

      // Get all applications to notify job seekers
      const applications = await Application.find({
        job: { $in: jobIds },
        status: { $nin: ['withdrawn', 'rejected', 'hired'] }
      }).populate('job', 'title');

      // Create notifications for job seekers
      const jobSeekerNotifications = applications.map(app => ({
        recipient: app.jobSeeker,
        type: 'application_status',
        title: 'Company No Longer Available',
        message: `${companyName} has closed their account. Your application for "${app.job?.title || 'a position'}" is no longer active.`,
        relatedJob: app.job?._id,
        relatedApplication: app._id
      }));

      if (jobSeekerNotifications.length > 0) {
        await Notification.insertMany(jobSeekerNotifications);
      }

      // Delete employer's data
      await Promise.all([
        EmployerProfile.deleteOne({ user: userId }),
        Job.deleteMany({ employer: userId }),
        Application.deleteMany({ job: { $in: jobIds } }),
        Notification.deleteMany({ recipient: userId })
      ]);

    } else if (userRole === 'training_center') {
      // Get training center profile for name
      const profile = await TrainingCenterProfile.findOne({ user: userId });
      const centerName = profile?.centerName || 'A training center';

      // Get all courses
      const courses = await TrainingCourse.find({ trainingCenter: userId });
      const courseIds = courses.map(course => course._id);

      // Get all inquiries to notify inquirers
      const inquiries = await CourseInquiry.find({
        course: { $in: courseIds },
        status: { $nin: ['closed', 'enrolled'] },
        inquirer: { $exists: true, $ne: null }
      }).populate('course', 'title');

      // Create notifications for inquirers
      const inquirerNotifications = inquiries.map(inq => ({
        recipient: inq.inquirer,
        type: 'course_inquiry',
        title: 'Training Center No Longer Available',
        message: `${centerName} has closed their account. Your inquiry about "${inq.course?.title || 'a course'}" is no longer active.`
      }));

      if (inquirerNotifications.length > 0) {
        await Notification.insertMany(inquirerNotifications);
      }

      // Delete training center's data
      await Promise.all([
        TrainingCenterProfile.deleteOne({ user: userId }),
        TrainingCourse.deleteMany({ trainingCenter: userId }),
        CourseInquiry.deleteMany({ trainingCenter: userId }),
        Notification.deleteMany({ recipient: userId })
      ]);
    }

    // Finally, delete the user account
    await User.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      message: 'Account and all related data deleted successfully'
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting account'
    });
  }
};

// @desc    Verify email address
// @route   POST /api/auth/verify-email
// @access  Public
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required'
      });
    }

    // Hash the token to compare with stored hash
    const emailVerificationToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid token
    const user = await User.findOne({
      emailVerificationToken,
      emailVerificationExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    // Check if already verified
    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Verify the user
    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Email verified successfully. You can now log in.'
    });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying email'
    });
  }
};

// @desc    Resend verification email
// @route   POST /api/auth/resend-verification
// @access  Public
exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Don't reveal if user exists
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a verification link has been sent'
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Generate new verification token
    const verificationToken = user.getEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    // Create verification URL
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;

    // Always log verification URL for development
    console.log(`\n📧 Verification link for ${email}:`);
    console.log(`   ${verificationUrl}\n`);

    try {
      await sendVerificationEmail(email, verificationUrl);

      res.status(200).json({
        success: true,
        message: 'Verification email sent. Please check your inbox.'
      });
    } catch (emailError) {
      console.error('Email send error:', emailError);
      // Still return success since URL is logged to console
      res.status(200).json({
        success: true,
        message: 'Verification link generated. Check server console if email not received.'
      });
    }
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending verification email'
    });
  }
};
