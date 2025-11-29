const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  register,
  login,
  getMe,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
  deleteAccount,
  verifyEmail,
  resendVerification
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const {
  authLimiter,
  passwordResetLimiter,
  registrationLimiter
} = require('../middleware/rateLimiter');

// Validation rules
const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('role')
    .optional()
    .isIn(['jobseeker', 'employer', 'training_center'])
    .withMessage('Invalid role specified'),
  body('agreeToTerms')
    .custom((value) => value === true || value === 'true')
    .withMessage('You must agree to the Terms of Service and Privacy Policy')
];

const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Routes
router.post('/register', registrationLimiter, registerValidation, register);
router.post('/login', authLimiter, loginValidation, login);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

// Password management routes
router.post('/forgot-password', passwordResetLimiter, forgotPassword);
router.post('/reset-password', passwordResetLimiter, resetPassword);
router.put('/change-password', protect, changePassword);

// Email verification routes
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', passwordResetLimiter, resendVerification);

// Account management routes
router.delete('/delete-account', protect, deleteAccount);

module.exports = router;
