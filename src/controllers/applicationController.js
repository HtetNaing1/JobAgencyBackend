const Application = require('../models/Application');
const Job = require('../models/Job');
const JobSeekerProfile = require('../models/JobSeekerProfile');
const EmployerProfile = require('../models/EmployerProfile');
const User = require('../models/User');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');
const mongoose = require('mongoose');
const {
  notifyApplicationReceived,
  notifyApplicationStatus,
  notifyInterviewScheduled,
  notifyFeedbackReceived
} = require('../utils/createNotification');
const {
  sendApplicationStatusEmail,
  sendInterviewEmail,
  sendNewApplicationEmail
} = require('../utils/sendEmail');

// Helper function to upload file to cloudinary
const uploadToCloudinary = (fileBuffer, folder, resourceType = 'auto') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: resourceType,
        type: 'upload',
        access_mode: 'public',
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};

// @desc    Submit a job application
// @route   POST /api/applications
// @access  Private (Job Seeker)
const submitApplication = async (req, res) => {
  try {
    const { jobId, coverLetterText, useProfileResume } = req.body;

    // Check if job exists and is active
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    if (job.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'This job is no longer accepting applications'
      });
    }

    // Check if application deadline has passed
    if (job.applicationDeadline && new Date(job.applicationDeadline) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Application deadline has passed'
      });
    }

    // Check if already applied
    const existingApplication = await Application.findOne({
      job: jobId,
      jobSeeker: req.user._id
    });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied to this job'
      });
    }

    // Get job seeker profile
    const profile = await JobSeekerProfile.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(400).json({
        success: false,
        message: 'Please complete your profile before applying'
      });
    }

    // Determine resume URL
    let resumeUrl;
    const useExistingResume = useProfileResume === 'true' || useProfileResume === true;

    if (useExistingResume) {
      // Use profile resume
      if (!profile.resumeUrl) {
        return res.status(400).json({
          success: false,
          message: 'No resume found in your profile. Please upload one.'
        });
      }
      resumeUrl = profile.resumeUrl;
    } else if (req.files?.resume) {
      // Upload new resume
      const resumeFile = req.files.resume[0];
      const resumeResult = await uploadToCloudinary(
        resumeFile.buffer,
        'job-agency/application-resumes'
      );
      resumeUrl = resumeResult.secure_url;
    } else if (profile.resumeUrl) {
      // Default to profile resume if no new one provided
      resumeUrl = profile.resumeUrl;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Please provide a resume for your application'
      });
    }

    // Handle cover letter (text or file)
    let coverLetter = {};
    if (req.files?.coverLetter) {
      const coverLetterFile = req.files.coverLetter[0];
      const coverLetterResult = await uploadToCloudinary(
        coverLetterFile.buffer,
        'job-agency/cover-letters'
      );
      coverLetter = {
        fileUrl: coverLetterResult.secure_url,
        fileName: coverLetterFile.originalname
      };
    } else if (coverLetterText) {
      coverLetter = {
        text: coverLetterText
      };
    }

    // Create application with profile snapshot
    const application = await Application.create({
      job: jobId,
      jobSeeker: req.user._id,
      employer: job.employer,
      coverLetter,
      resumeUrl,
      profileSnapshot: {
        firstName: profile.firstName,
        lastName: profile.lastName,
        skills: profile.skills,
        experience: profile.experience?.length > 0
          ? `${profile.experience[0].position} at ${profile.experience[0].company}`
          : 'Not specified',
        education: profile.education?.length > 0
          ? `${profile.education[0].degree} from ${profile.education[0].institution}`
          : 'Not specified'
      },
      statusHistory: [{
        status: 'pending',
        changedAt: new Date()
      }]
    });

    // Increment application count on job
    await Job.findByIdAndUpdate(jobId, { $inc: { applicationCount: 1 } });

    // Send notification to employer
    const applicantName = `${profile.firstName} ${profile.lastName}`;
    notifyApplicationReceived(
      job.employer,
      req.user._id,
      jobId,
      application._id,
      job.title,
      applicantName
    );

    // Send email notification to employer (non-blocking)
    try {
      const employerUser = await User.findById(job.employer);
      const employerProfile = await EmployerProfile.findOne({ user: job.employer });
      if (employerUser?.email) {
        const applicationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/employer/applications`;
        sendNewApplicationEmail(
          employerUser.email,
          employerProfile?.companyName || 'Hiring Team',
          job.title,
          applicantName,
          applicationUrl
        ).catch(err => console.error('Failed to send new application email:', err.message));
      }
    } catch (emailErr) {
      console.error('Error preparing application email:', emailErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: application
    });
  } catch (error) {
    console.error('Error submitting application:', error);

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied to this job'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error submitting application',
      error: error.message
    });
  }
};

// @desc    Get job seeker's applications
// @route   GET /api/applications
// @access  Private (Job Seeker)
const getJobSeekerApplications = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const query = { jobSeeker: req.user._id };
    if (status && status !== 'all') {
      query.status = status;
    }

    const applications = await Application.find(query)
      .populate({
        path: 'job',
        select: 'title jobType location salary status applicationDeadline',
        populate: {
          path: 'employer',
          select: 'email',
          populate: {
            path: 'employerProfile',
            select: 'companyName logo industry'
          }
        }
      })
      .sort({ appliedDate: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Application.countDocuments(query);

    // Get counts by status
    const jobSeekerId = new mongoose.Types.ObjectId(req.user._id);
    const statusCounts = await Application.aggregate([
      { $match: { jobSeeker: jobSeekerId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: applications,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit)
      },
      statusCounts: statusCounts.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching applications',
      error: error.message
    });
  }
};

// @desc    Get single application details
// @route   GET /api/applications/:id
// @access  Private
const getApplicationById = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate({
        path: 'job',
        populate: {
          path: 'employer',
          select: 'email',
          populate: {
            path: 'employerProfile',
            select: 'companyName logo industry location website'
          }
        }
      })
      .populate({
        path: 'jobSeeker',
        select: 'email',
        populate: {
          path: 'jobSeekerProfile',
          select: 'firstName lastName phone skills experience education resume photo location'
        }
      });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Check authorization
    const isJobSeeker = application.jobSeeker._id.toString() === req.user._id.toString();
    const isEmployer = application.employer.toString() === req.user._id.toString();

    if (!isJobSeeker && !isEmployer) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this application'
      });
    }

    res.json({
      success: true,
      data: application
    });
  } catch (error) {
    console.error('Error fetching application:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching application',
      error: error.message
    });
  }
};

// @desc    Get applications for a specific job (Employer)
// @route   GET /api/applications/job/:jobId
// @access  Private (Employer)
const getApplicationsForJob = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    // Verify job ownership
    const job = await Job.findById(req.params.jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    if (job.employer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view applications for this job'
      });
    }

    const query = { job: req.params.jobId };
    if (status && status !== 'all') {
      query.status = status;
    }

    const applications = await Application.find(query)
      .populate({
        path: 'jobSeeker',
        select: 'email',
        populate: {
          path: 'jobSeekerProfile',
          select: 'firstName lastName phone skills experience education resume photo location'
        }
      })
      .sort({ appliedDate: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Application.countDocuments(query);

    res.json({
      success: true,
      data: applications,
      job: {
        _id: job._id,
        title: job.title
      },
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching applications',
      error: error.message
    });
  }
};

// @desc    Get all applications for employer
// @route   GET /api/applications/employer
// @access  Private (Employer)
const getEmployerApplications = async (req, res) => {
  try {
    const { status, jobId, page = 1, limit = 20 } = req.query;

    const query = { employer: req.user._id };
    if (status && status !== 'all') {
      query.status = status;
    }
    if (jobId) {
      query.job = jobId;
    }

    const applications = await Application.find(query)
      .populate({
        path: 'job',
        select: 'title jobType location status'
      })
      .populate({
        path: 'jobSeeker',
        select: 'email',
        populate: {
          path: 'jobSeekerProfile',
          select: 'firstName lastName skills experience photo location'
        }
      })
      .sort({ appliedDate: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Application.countDocuments(query);

    // Get counts by status
    const employerId = new mongoose.Types.ObjectId(req.user._id);
    const statusCounts = await Application.aggregate([
      { $match: { employer: employerId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Get applications grouped by job
    const applicationsByJob = await Application.aggregate([
      { $match: { employer: employerId } },
      { $group: { _id: '$job', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: applications,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit)
      },
      statusCounts: statusCounts.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      applicationsByJob
    });
  } catch (error) {
    console.error('Error fetching employer applications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching applications',
      error: error.message
    });
  }
};

// @desc    Update application status
// @route   PUT /api/applications/:id/status
// @access  Private (Employer)
const updateApplicationStatus = async (req, res) => {
  try {
    const { status, note } = req.body;

    const validStatuses = ['pending', 'reviewed', 'shortlisted', 'interview', 'rejected', 'hired'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Verify employer owns the job
    if (application.employer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this application'
      });
    }

    application.status = status;
    application.statusHistory.push({
      status,
      changedAt: new Date(),
      changedBy: req.user._id,
      note
    });

    await application.save();

    // Get job and employer details for notification
    const job = await Job.findById(application.job);
    const employerProfile = await EmployerProfile.findOne({ user: req.user._id });
    const companyName = employerProfile?.companyName || 'The employer';

    // Send notification to job seeker
    notifyApplicationStatus(
      application.jobSeeker,
      application._id,
      application.job,
      job?.title || 'the position',
      companyName,
      status
    );

    // Send email notification to job seeker (non-blocking)
    try {
      const jobSeekerUser = await User.findById(application.jobSeeker);
      const jobSeekerProfile = await JobSeekerProfile.findOne({ user: application.jobSeeker });
      if (jobSeekerUser?.email) {
        const applicationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/applications`;
        const userName = jobSeekerProfile ? `${jobSeekerProfile.firstName}` : 'there';
        sendApplicationStatusEmail(
          jobSeekerUser.email,
          userName,
          job?.title || 'the position',
          companyName,
          status,
          applicationUrl
        ).catch(err => console.error('Failed to send status update email:', err.message));
      }
    } catch (emailErr) {
      console.error('Error preparing status email:', emailErr.message);
    }

    res.json({
      success: true,
      message: 'Application status updated',
      data: application
    });
  } catch (error) {
    console.error('Error updating application status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating application status',
      error: error.message
    });
  }
};

// @desc    Bulk update application status
// @route   PUT /api/applications/bulk-status
// @access  Private (Employer)
const bulkUpdateStatus = async (req, res) => {
  try {
    const { applicationIds, status, note } = req.body;

    const validStatuses = ['reviewed', 'shortlisted', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status for bulk update'
      });
    }

    // Verify all applications belong to employer
    const applications = await Application.find({
      _id: { $in: applicationIds },
      employer: req.user._id
    });

    if (applications.length !== applicationIds.length) {
      return res.status(403).json({
        success: false,
        message: 'Some applications not found or not authorized'
      });
    }

    // Update all applications
    await Application.updateMany(
      { _id: { $in: applicationIds }, employer: req.user._id },
      {
        $set: { status },
        $push: {
          statusHistory: {
            status,
            changedAt: new Date(),
            changedBy: req.user._id,
            note
          }
        }
      }
    );

    res.json({
      success: true,
      message: `${applicationIds.length} applications updated to ${status}`,
      updatedCount: applicationIds.length
    });
  } catch (error) {
    console.error('Error bulk updating applications:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating applications',
      error: error.message
    });
  }
};

// @desc    Provide feedback on application
// @route   POST /api/applications/:id/feedback
// @access  Private (Employer)
const provideFeedback = async (req, res) => {
  try {
    const { message, category } = req.body;

    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    if (application.employer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to provide feedback'
      });
    }

    application.feedback = {
      message,
      category,
      providedAt: new Date()
    };

    await application.save();

    // Get job and employer details for notification
    const job = await Job.findById(application.job);
    const employerProfile = await EmployerProfile.findOne({ user: req.user._id });
    const companyName = employerProfile?.companyName || 'The employer';

    // Send notification to job seeker
    notifyFeedbackReceived(
      application.jobSeeker,
      application._id,
      application.job,
      job?.title || 'the position',
      companyName
    );

    res.json({
      success: true,
      message: 'Feedback provided successfully',
      data: application
    });
  } catch (error) {
    console.error('Error providing feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Error providing feedback',
      error: error.message
    });
  }
};

// @desc    Schedule interview
// @route   POST /api/applications/:id/interview
// @access  Private (Employer)
const scheduleInterview = async (req, res) => {
  try {
    const { scheduledDate, location, meetingLink, notes } = req.body;

    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    if (application.employer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to schedule interview'
      });
    }

    // Validate date is in future
    if (new Date(scheduledDate) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Interview date must be in the future'
      });
    }

    application.interview = {
      scheduledDate,
      location,
      meetingLink,
      notes,
      status: 'scheduled'
    };
    application.status = 'interview';
    application.statusHistory.push({
      status: 'interview',
      changedAt: new Date(),
      changedBy: req.user._id,
      note: `Interview scheduled for ${new Date(scheduledDate).toLocaleDateString()}`
    });

    await application.save();

    // Get job and employer details for notification
    const job = await Job.findById(application.job);
    const employerProfile = await EmployerProfile.findOne({ user: req.user._id });
    const companyName = employerProfile?.companyName || 'The employer';

    // Send notification to job seeker
    notifyInterviewScheduled(
      application.jobSeeker,
      application._id,
      application.job,
      job?.title || 'the position',
      companyName,
      scheduledDate
    );

    // Send interview email to job seeker (non-blocking)
    try {
      const jobSeekerUser = await User.findById(application.jobSeeker);
      const jobSeekerProfile = await JobSeekerProfile.findOne({ user: application.jobSeeker });
      if (jobSeekerUser?.email) {
        const userName = jobSeekerProfile ? `${jobSeekerProfile.firstName}` : 'there';
        sendInterviewEmail(
          jobSeekerUser.email,
          userName,
          job?.title || 'the position',
          companyName,
          scheduledDate,
          location,
          meetingLink,
          notes
        ).catch(err => console.error('Failed to send interview email:', err.message));
      }
    } catch (emailErr) {
      console.error('Error preparing interview email:', emailErr.message);
    }

    res.json({
      success: true,
      message: 'Interview scheduled successfully',
      data: application
    });
  } catch (error) {
    console.error('Error scheduling interview:', error);
    res.status(500).json({
      success: false,
      message: 'Error scheduling interview',
      error: error.message
    });
  }
};

// @desc    Withdraw application
// @route   PUT /api/applications/:id/withdraw
// @access  Private (Job Seeker)
const withdrawApplication = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    if (application.jobSeeker.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to withdraw this application'
      });
    }

    if (['hired', 'withdrawn'].includes(application.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot withdraw this application'
      });
    }

    application.status = 'withdrawn';
    application.statusHistory.push({
      status: 'withdrawn',
      changedAt: new Date(),
      changedBy: req.user._id,
      note: 'Application withdrawn by job seeker'
    });

    await application.save();

    // Decrement application count on job
    await Job.findByIdAndUpdate(application.job, { $inc: { applicationCount: -1 } });

    res.json({
      success: true,
      message: 'Application withdrawn successfully',
      data: application
    });
  } catch (error) {
    console.error('Error withdrawing application:', error);
    res.status(500).json({
      success: false,
      message: 'Error withdrawing application',
      error: error.message
    });
  }
};

// @desc    Check if user has applied to a job
// @route   GET /api/applications/check/:jobId
// @access  Private (Job Seeker)
const checkApplication = async (req, res) => {
  try {
    const application = await Application.findOne({
      job: req.params.jobId,
      jobSeeker: req.user._id
    }).select('status appliedDate');

    res.json({
      success: true,
      hasApplied: !!application,
      application
    });
  } catch (error) {
    console.error('Error checking application:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking application',
      error: error.message
    });
  }
};

module.exports = {
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
};
