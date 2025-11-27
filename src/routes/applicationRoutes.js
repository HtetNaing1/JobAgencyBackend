const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, authorize } = require('../middleware/auth');
const {
  submitApplication,
  getJobSeekerApplications,
  getApplicationById,
  getApplicationsForJob,
  getEmployerApplications,
  updateApplicationStatus,
  bulkUpdateStatus,
  provideFeedback,
  scheduleInterview,
  withdrawApplication,
  checkApplication
} = require('../controllers/applicationController');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow PDF, DOC, DOCX files
    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and Word documents are allowed.'), false);
    }
  }
});

// Job Seeker routes
router.post(
  '/',
  protect,
  authorize('jobseeker'),
  upload.fields([
    { name: 'resume', maxCount: 1 },
    { name: 'coverLetter', maxCount: 1 }
  ]),
  submitApplication
);
router.get('/', protect, authorize('jobseeker'), getJobSeekerApplications);
router.get('/check/:jobId', protect, authorize('jobseeker'), checkApplication);
router.put('/:id/withdraw', protect, authorize('jobseeker'), withdrawApplication);

// Employer routes
router.get('/employer', protect, authorize('employer'), getEmployerApplications);
router.get('/job/:jobId', protect, authorize('employer'), getApplicationsForJob);
router.put('/bulk-status', protect, authorize('employer'), bulkUpdateStatus);
router.put('/:id/status', protect, authorize('employer'), updateApplicationStatus);
router.post('/:id/feedback', protect, authorize('employer'), provideFeedback);
router.post('/:id/interview', protect, authorize('employer'), scheduleInterview);

// Shared routes (both job seeker and employer can access)
router.get('/:id', protect, getApplicationById);

module.exports = router;
