const express = require('express');
const router = express.Router();
const {
  createOrUpdateProfile,
  getProfile,
  getProfileById,
  uploadResume,
  deleteResume,
  uploadPhoto,
  addExperience,
  deleteExperience,
  addEducation,
  deleteEducation,
} = require('../controllers/jobSeekerController');
const { protect } = require('../middleware/auth');
const { checkRole } = require('../middleware/checkRole');
const { uploadResume: resumeUpload, uploadImage } = require('../middleware/upload');

// Profile routes
router.route('/profile')
  .get(protect, checkRole('jobseeker'), getProfile)
  .post(protect, checkRole('jobseeker'), createOrUpdateProfile);

// Get profile by user ID (for employers viewing applicants)
router.get('/profile/:userId', protect, checkRole('employer', 'admin'), getProfileById);

// Resume routes
router.route('/resume')
  .post(protect, checkRole('jobseeker'), resumeUpload.single('resume'), uploadResume)
  .delete(protect, checkRole('jobseeker'), deleteResume);

// Photo route
router.post('/photo', protect, checkRole('jobseeker'), uploadImage.single('photo'), uploadPhoto);

// Experience routes
router.route('/experience')
  .post(protect, checkRole('jobseeker'), addExperience);

router.delete('/experience/:expId', protect, checkRole('jobseeker'), deleteExperience);

// Education routes
router.route('/education')
  .post(protect, checkRole('jobseeker'), addEducation);

router.delete('/education/:eduId', protect, checkRole('jobseeker'), deleteEducation);

module.exports = router;
