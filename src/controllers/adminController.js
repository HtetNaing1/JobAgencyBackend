const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');
const JobSeekerProfile = require('../models/JobSeekerProfile');
const EmployerProfile = require('../models/EmployerProfile');
const TrainingCenterProfile = require('../models/TrainingCenterProfile');
const TrainingCourse = require('../models/TrainingCourse');
const CourseInquiry = require('../models/CourseInquiry');
const { notifyEmployerBanned, notifyTrainingCenterBanned } = require('../utils/createNotification');

exports.getDashboardStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalJobSeekers,
      totalEmployers,
      totalTrainingCenters,
      totalJobs,
      activeJobs,
      totalApplications,
      totalCourses,
      recentUsers,
      recentJobs
    ] = await Promise.all([
      User.countDocuments({ role: { $ne: 'admin' } }),
      User.countDocuments({ role: 'jobseeker' }),
      User.countDocuments({ role: 'employer' }),
      User.countDocuments({ role: 'training_center' }),
      Job.countDocuments(),
      Job.countDocuments({ status: 'active' }),
      Application.countDocuments(),
      TrainingCourse.countDocuments(),
      User.find({ role: { $ne: 'admin' } })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('email role isActive createdAt'),
      Job.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('employerProfile', 'companyName')
        .select('title status createdAt employerProfile')
    ]);

    // Get application stats by status
    const applicationStats = await Application.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Get user registration trend (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const registrationTrend = await User.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo }, role: { $ne: 'admin' } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get verified vs unverified training centers
    const verifiedCenters = await TrainingCenterProfile.countDocuments({ isVerified: true });
    const unverifiedCenters = await TrainingCenterProfile.countDocuments({ isVerified: false });

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalJobSeekers,
          totalEmployers,
          totalTrainingCenters,
          totalJobs,
          activeJobs,
          totalApplications,
          totalCourses
        },
        applicationStats: applicationStats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {}),
        trainingCenters: {
          verified: verifiedCenters,
          unverified: unverifiedCenters
        },
        registrationTrend,
        recentUsers,
        recentJobs
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics'
    });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const { role, isActive, search, page = 1, limit = 10 } = req.query;

    const query = { role: { $ne: 'admin' } };

    if (role && role !== 'all') {
      query.role = role;
    }

    if (isActive !== undefined && isActive !== 'all') {
      query.isActive = isActive === 'true';
    }

    if (search) {
      query.email = { $regex: search, $options: 'i' };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      User.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('-password'),
      User.countDocuments(query)
    ]);

    // Get profile info for each user
    const usersWithProfiles = await Promise.all(users.map(async (user) => {
      let profile = null;
      if (user.role === 'jobseeker') {
        profile = await JobSeekerProfile.findOne({ user: user._id })
          .select('firstName lastName');
      } else if (user.role === 'employer') {
        profile = await EmployerProfile.findOne({ user: user._id })
          .select('companyName');
      } else if (user.role === 'training_center') {
        profile = await TrainingCenterProfile.findOne({ user: user._id })
          .select('centerName isVerified');
      }
      return {
        ...user.toObject(),
        profile
      };
    }));

    res.status(200).json({
      success: true,
      data: usersWithProfiles,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { isActive } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify admin users'
      });
    }

    user.isActive = isActive;
    await user.save();

    res.status(200).json({
      success: true,
      data: user,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status'
    });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete admin users'
      });
    }

    // Delete associated profiles and data
    if (user.role === 'jobseeker') {
      await JobSeekerProfile.deleteOne({ user: user._id });
      // Delete applications made by this jobseeker (Application.jobSeeker references User._id)
      await Application.deleteMany({ jobSeeker: user._id });
      // Delete course inquiries made by this jobseeker (CourseInquiry.inquirer references User._id)
      await CourseInquiry.deleteMany({ inquirer: user._id });
    } else if (user.role === 'employer') {
      // Get employer profile for company name
      const employerProfile = await EmployerProfile.findOne({ user: user._id });
      const companyName = employerProfile?.companyName || 'The company';

      // Find all jobs by this employer and notify applicants
      const jobs = await Job.find({ employer: user._id });
      for (const job of jobs) {
        // Find all applications for this job and notify applicants
        const applications = await Application.find({ job: job._id }).populate('jobSeeker', '_id');
        for (const application of applications) {
          if (application.jobSeeker) {
            await notifyEmployerBanned(application.jobSeeker._id, companyName, job.title);
          }
        }
        // Delete applications for this job
        await Application.deleteMany({ job: job._id });
      }

      // Delete all jobs posted by this employer
      await Job.deleteMany({ employer: user._id });
      await EmployerProfile.deleteOne({ user: user._id });
    } else if (user.role === 'training_center') {
      const profile = await TrainingCenterProfile.findOne({ user: user._id });
      if (profile) {
        const centerName = profile.centerName || 'The training center';

        // Find all courses and notify enrolled users
        const courses = await TrainingCourse.find({ trainingCenterProfile: profile._id });
        for (const course of courses) {
          // Find all inquiries for this course and notify inquirers
          const inquiries = await CourseInquiry.find({ course: course._id }).populate('inquirer', '_id');
          for (const inquiry of inquiries) {
            if (inquiry.inquirer) {
              await notifyTrainingCenterBanned(inquiry.inquirer._id, centerName, course.title);
            }
          }
          // Delete inquiries for this course
          await CourseInquiry.deleteMany({ course: course._id });
        }

        // Delete all courses posted by this training center
        await TrainingCourse.deleteMany({ trainingCenterProfile: profile._id });
        await TrainingCenterProfile.deleteOne({ user: user._id });
      }
    }

    await User.deleteOne({ _id: user._id });

    res.status(200).json({
      success: true,
      message: 'User and associated data deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
};

exports.getJobs = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;

    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [jobs, total] = await Promise.all([
      Job.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('employer', 'companyName logo'),
      Job.countDocuments(query)
    ]);

    // Get application count for each job
    const jobsWithStats = await Promise.all(jobs.map(async (job) => {
      const applicationCount = await Application.countDocuments({ job: job._id });
      return {
        ...job.toObject(),
        applicationCount
      };
    }));

    res.status(200).json({
      success: true,
      data: jobsWithStats,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch jobs'
    });
  }
};

exports.updateJobStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    job.status = status;
    await job.save();

    res.status(200).json({
      success: true,
      data: job,
      message: `Job status updated to ${status}`
    });
  } catch (error) {
    console.error('Error updating job status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update job status'
    });
  }
};

exports.deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Delete associated applications
    await Application.deleteMany({ job: job._id });
    await Job.deleteOne({ _id: job._id });

    res.status(200).json({
      success: true,
      message: 'Job and associated applications deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete job'
    });
  }
};

exports.getTrainingCenters = async (req, res) => {
  try {
    const { isVerified, search, page = 1, limit = 10 } = req.query;

    const query = {};

    if (isVerified !== undefined && isVerified !== 'all') {
      query.isVerified = isVerified === 'true';
    }

    if (search) {
      query.centerName = { $regex: search, $options: 'i' };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [centers, total] = await Promise.all([
      TrainingCenterProfile.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('user', 'email isActive createdAt'),
      TrainingCenterProfile.countDocuments(query)
    ]);

    // Get course count for each center
    const centersWithStats = await Promise.all(centers.map(async (center) => {
      const courseCount = await TrainingCourse.countDocuments({
        trainingCenterProfile: center._id
      });
      const inquiryCount = await CourseInquiry.countDocuments({
        trainingCenter: center.user._id
      });
      return {
        ...center.toObject(),
        courseCount,
        inquiryCount
      };
    }));

    res.status(200).json({
      success: true,
      data: centersWithStats,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching training centers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch training centers'
    });
  }
};

exports.updateTrainingCenterVerification = async (req, res) => {
  try {
    const { isVerified } = req.body;

    const center = await TrainingCenterProfile.findById(req.params.id);

    if (!center) {
      return res.status(404).json({
        success: false,
        message: 'Training center not found'
      });
    }

    center.isVerified = isVerified;
    await center.save();

    res.status(200).json({
      success: true,
      data: center,
      message: `Training center ${isVerified ? 'verified' : 'unverified'} successfully`
    });
  } catch (error) {
    console.error('Error updating training center verification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update training center verification'
    });
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(period));

    // User registrations over time
    const userRegistrations = await User.aggregate([
      { $match: { createdAt: { $gte: daysAgo }, role: { $ne: 'admin' } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            role: '$role'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    // Job postings over time
    const jobPostings = await Job.aggregate([
      { $match: { createdAt: { $gte: daysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Applications over time
    const applications = await Application.aggregate([
      { $match: { createdAt: { $gte: daysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Top job skills
    const topCategories = await Job.aggregate([
      { $unwind: '$requirements.skills' },
      { $group: { _id: '$requirements.skills', count: { $sum: 1 } } },
      { $match: { _id: { $ne: null, $ne: '' } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Top locations
    const topLocations = await Job.aggregate([
      { $match: { 'location.city': { $ne: null, $ne: '' } } },
      { $group: { _id: '$location.city', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Application success rate
    const applicationOutcomes = await Application.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Top employers by job count
    const topEmployers = await Job.aggregate([
      { $match: { employerProfile: { $ne: null } } },
      { $group: { _id: '$employerProfile', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'employerprofiles',
          localField: '_id',
          foreignField: '_id',
          as: 'employerInfo'
        }
      },
      { $unwind: { path: '$employerInfo', preserveNullAndEmptyArrays: false } },
      { $project: { companyName: '$employerInfo.companyName', count: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        userRegistrations,
        jobPostings,
        applications,
        topCategories,
        topLocations,
        applicationOutcomes,
        topEmployers
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics'
    });
  }
};
