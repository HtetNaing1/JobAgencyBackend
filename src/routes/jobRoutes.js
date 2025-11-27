const express = require('express');
const router = express.Router();
const {
  createJob,
  getAllJobs,
  getJobById,
  getEmployerJobs,
  updateJob,
  deleteJob,
  toggleJobStatus,
} = require('../controllers/jobController');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.get('/', getAllJobs);
router.get('/:id', getJobById);

// Protected routes (Employer only)
router.post('/', protect, authorize('employer'), createJob);
router.get('/employer/me', protect, authorize('employer'), getEmployerJobs);
router.put('/:id', protect, authorize('employer'), updateJob);
router.put('/:id/status', protect, authorize('employer'), toggleJobStatus);
router.delete('/:id', protect, authorize('employer'), deleteJob);

module.exports = router;
