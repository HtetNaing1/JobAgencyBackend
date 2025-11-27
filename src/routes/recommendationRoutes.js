const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getRecommendations, getSimilar } = require('../controllers/recommendationController');

// Protected route - only job seekers can get personalized recommendations
router.get('/', protect, authorize('jobseeker'), getRecommendations);

// Public route - anyone can see similar jobs
router.get('/similar/:jobId', getSimilar);

module.exports = router;
