const express = require('express');
const router = express.Router();
const {
  createOrUpdateProfile,
  getProfile,
  getProfileById,
  getEmployerJobs,
  uploadLogo,
  uploadCoverImage,
  getAllEmployers,
} = require('../controllers/employerController');
const { protect } = require('../middleware/auth');
const { checkRole } = require('../middleware/checkRole');
const { uploadLogo: logoUpload, uploadImage } = require('../middleware/upload');

// Public routes
router.get('/', getAllEmployers);
router.get('/profile/:userId', getProfileById);
router.get('/:userId/jobs', getEmployerJobs);

// Protected routes
router.route('/profile')
  .get(protect, checkRole('employer'), getProfile)
  .post(protect, checkRole('employer'), createOrUpdateProfile);

// Logo upload
router.post('/logo', protect, checkRole('employer'), logoUpload.single('logo'), uploadLogo);

// Cover image upload
router.post('/cover', protect, checkRole('employer'), uploadImage.single('cover'), uploadCoverImage);

module.exports = router;
