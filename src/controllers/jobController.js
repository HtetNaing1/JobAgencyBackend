const Job = require('../models/Job');
const EmployerProfile = require('../models/EmployerProfile');

// @desc    Create a new job posting
// @route   POST /api/jobs
// @access  Private (Employer only)
exports.createJob = async (req, res) => {
  try {
    const {
      title,
      description,
      requirements,
      jobType,
      location,
      salary,
      benefits,
      status,
      applicationDeadline,
    } = req.body;

    // Get employer profile
    const employerProfile = await EmployerProfile.findOne({ user: req.user._id });

    const job = await Job.create({
      employer: req.user._id,
      employerProfile: employerProfile?._id,
      title,
      description,
      requirements,
      jobType,
      location,
      salary,
      benefits,
      status: status || 'active',
      applicationDeadline,
    });

    res.status(201).json({
      success: true,
      message: 'Job posted successfully',
      data: job,
    });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating job posting',
      error: error.message,
    });
  }
};

// @desc    Get all jobs (public - with filters)
// @route   GET /api/jobs
// @access  Public
exports.getAllJobs = async (req, res) => {
  try {
    const {
      search,
      jobType,
      location,
      remote,
      minSalary,
      maxSalary,
      skills,
      sort,
      page = 1,
      limit = 10,
    } = req.query;

    // Build query
    const query = { status: 'active' };

    // Text search
    if (search) {
      query.$text = { $search: search };
    }

    // Job type filter
    if (jobType) {
      const types = jobType.split(',');
      query.jobType = { $in: types };
    }

    // Location filter
    if (location) {
      query.$or = [
        { 'location.city': { $regex: location, $options: 'i' } },
        { 'location.state': { $regex: location, $options: 'i' } },
        { 'location.country': { $regex: location, $options: 'i' } },
      ];
    }

    // Remote filter
    if (remote === 'true') {
      query['location.remote'] = true;
    }

    // Salary range filter
    if (minSalary) {
      query['salary.min'] = { $gte: parseInt(minSalary) };
    }
    if (maxSalary) {
      query['salary.max'] = { $lte: parseInt(maxSalary) };
    }

    // Skills filter
    if (skills) {
      const skillsArray = skills.split(',').map(s => s.trim());
      query['requirements.skills'] = { $in: skillsArray };
    }

    // Sorting
    let sortOption = { postedDate: -1 }; // Default: newest first
    if (sort === 'salary_high') {
      sortOption = { 'salary.max': -1 };
    } else if (sort === 'salary_low') {
      sortOption = { 'salary.min': 1 };
    } else if (sort === 'oldest') {
      sortOption = { postedDate: 1 };
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const jobs = await Job.find(query)
      .populate({
        path: 'employerProfile',
        select: 'companyName logo industry companySize',
      })
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Job.countDocuments(query);

    res.status(200).json({
      success: true,
      data: jobs,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching jobs',
      error: error.message,
    });
  }
};

// @desc    Get single job by ID
// @route   GET /api/jobs/:id
// @access  Public
exports.getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate({
        path: 'employerProfile',
        select: 'companyName logo industry companySize description website location benefits',
      });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    // Increment view count
    job.viewCount += 1;
    await job.save();

    res.status(200).json({
      success: true,
      data: job,
    });
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching job',
      error: error.message,
    });
  }
};

// @desc    Get jobs by employer
// @route   GET /api/jobs/employer/me
// @access  Private (Employer only)
exports.getEmployerJobs = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const query = { employer: req.user._id };

    if (status && status !== 'all') {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const jobs = await Job.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Job.countDocuments(query);

    // Get stats
    const stats = await Job.aggregate([
      { $match: { employer: req.user._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const statsObj = {
      total: 0,
      active: 0,
      draft: 0,
      paused: 0,
      closed: 0,
    };

    stats.forEach(s => {
      statsObj[s._id] = s.count;
      statsObj.total += s.count;
    });

    res.status(200).json({
      success: true,
      data: jobs,
      stats: statsObj,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error('Get employer jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching jobs',
      error: error.message,
    });
  }
};

// @desc    Update job
// @route   PUT /api/jobs/:id
// @access  Private (Employer only - owner)
exports.updateJob = async (req, res) => {
  try {
    let job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    // Check ownership
    if (job.employer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this job',
      });
    }

    const {
      title,
      description,
      requirements,
      jobType,
      location,
      salary,
      benefits,
      status,
      applicationDeadline,
    } = req.body;

    job = await Job.findByIdAndUpdate(
      req.params.id,
      {
        title,
        description,
        requirements,
        jobType,
        location,
        salary,
        benefits,
        status,
        applicationDeadline,
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Job updated successfully',
      data: job,
    });
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating job',
      error: error.message,
    });
  }
};

// @desc    Delete job (soft delete - set status to closed)
// @route   DELETE /api/jobs/:id
// @access  Private (Employer only - owner)
exports.deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    // Check ownership
    if (job.employer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this job',
      });
    }

    // Soft delete - set status to closed
    job.status = 'closed';
    await job.save();

    res.status(200).json({
      success: true,
      message: 'Job closed successfully',
    });
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting job',
      error: error.message,
    });
  }
};

// @desc    Toggle job status (pause/activate)
// @route   PUT /api/jobs/:id/status
// @access  Private (Employer only - owner)
exports.toggleJobStatus = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    // Check ownership
    if (job.employer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this job',
      });
    }

    const { status } = req.body;

    if (!['active', 'paused', 'closed', 'draft'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
      });
    }

    job.status = status;
    await job.save();

    res.status(200).json({
      success: true,
      message: `Job status changed to ${status}`,
      data: job,
    });
  } catch (error) {
    console.error('Toggle job status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating job status',
      error: error.message,
    });
  }
};
