const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  createCourse,
  getMyCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  getAllCourses,
  getCoursesByCenter,
  submitInquiry,
  getInquiries,
  updateInquiryStatus,
  getCategories,
  getMyInquiryForCourse,
  getUserInquiries
} = require('../controllers/courseController');

// Public routes
router.get('/categories', getCategories);
router.get('/', getAllCourses);
router.get('/center/:centerId', getCoursesByCenter);

// Protected training center routes - must come BEFORE /:id to avoid matching 'me' as id
router.get('/me/courses', protect, authorize('training_center'), getMyCourses);
router.get('/me/inquiries', protect, authorize('training_center'), getInquiries);
router.put('/inquiries/:inquiryId', protect, authorize('training_center'), updateInquiryStatus);

// Job seeker routes for tracking inquiries - must come before /:id
router.get('/user/inquiries', protect, authorize('jobseeker'), getUserInquiries);

// Public course detail route - after /me/* and /user/* routes
router.get('/:id', getCourseById);

// Protected routes for course management and inquiries
router.post('/', protect, authorize('training_center'), createCourse);
router.put('/:id', protect, authorize('training_center'), updateCourse);
router.delete('/:id', protect, authorize('training_center'), deleteCourse);

// Job seeker inquiry routes
router.get('/:id/my-inquiry', protect, authorize('jobseeker'), getMyInquiryForCourse);
router.post('/:id/inquiry', protect, authorize('jobseeker'), submitInquiry);

module.exports = router;
