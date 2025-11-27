const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getDashboardStats,
  getUsers,
  updateUserStatus,
  deleteUser,
  getJobs,
  updateJobStatus,
  deleteJob,
  getTrainingCenters,
  updateTrainingCenterVerification,
  getAnalytics
} = require('../controllers/adminController');

// All routes require admin authentication
router.use(protect);
router.use(authorize('admin'));

// Dashboard
router.get('/dashboard', getDashboardStats);

// User management
router.get('/users', getUsers);
router.put('/users/:id/status', updateUserStatus);
router.delete('/users/:id', deleteUser);

// Job moderation
router.get('/jobs', getJobs);
router.put('/jobs/:id/status', updateJobStatus);
router.delete('/jobs/:id', deleteJob);

// Training center verification
router.get('/training-centers', getTrainingCenters);
router.put('/training-centers/:id/verify', updateTrainingCenterVerification);

// Analytics
router.get('/analytics', getAnalytics);

module.exports = router;
