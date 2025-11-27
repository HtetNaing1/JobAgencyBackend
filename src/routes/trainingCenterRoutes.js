const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { uploadLogo: logoUpload } = require('../middleware/upload');
const {
  createOrUpdateProfile,
  getMyProfile,
  getProfileById,
  getProfileByUserId,
  getAllTrainingCenters,
  uploadLogo,
  getDashboardStats
} = require('../controllers/trainingCenterController');

// Public routes
router.get('/', getAllTrainingCenters);

// Protected routes (Training Centers only) - /me routes must come before /:id
router.get('/me/profile', protect, authorize('training_center'), getMyProfile);
router.get('/me/dashboard', protect, authorize('training_center'), getDashboardStats);
router.post('/profile', protect, authorize('training_center'), createOrUpdateProfile);
router.put('/profile', protect, authorize('training_center'), createOrUpdateProfile);
router.post('/logo', protect, authorize('training_center'), logoUpload.single('logo'), uploadLogo);

// Public route to get profile by user ID
router.get('/user/:userId', getProfileByUserId);

// Public route with dynamic param - must come after /me routes
router.get('/:id', getProfileById);

module.exports = router;
