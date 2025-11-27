const TrainingCenterProfile = require('../models/TrainingCenterProfile');
const TrainingCourse = require('../models/TrainingCourse');
const CourseInquiry = require('../models/CourseInquiry');
const { uploadToCloudinary } = require('../middleware/upload');

// @desc    Create or update training center profile
// @route   POST /api/training-centers/profile
// @access  Private (Training Centers only)
exports.createOrUpdateProfile = async (req, res) => {
  try {
    const {
      centerName,
      description,
      specializations,
      location,
      contactInfo,
      accreditations,
      establishedYear,
      socialMedia
    } = req.body;

    let profile = await TrainingCenterProfile.findOne({ user: req.user.id });

    const profileData = {
      user: req.user.id,
      centerName,
      description,
      specializations: specializations || [],
      location,
      contactInfo,
      accreditations: accreditations || [],
      establishedYear,
      socialMedia
    };

    if (profile) {
      // Update existing profile
      profile = await TrainingCenterProfile.findOneAndUpdate(
        { user: req.user.id },
        profileData,
        { new: true, runValidators: true }
      );
    } else {
      // Create new profile
      profile = await TrainingCenterProfile.create(profileData);
    }

    res.status(profile ? 200 : 201).json({
      success: true,
      message: profile ? 'Profile updated successfully' : 'Profile created successfully',
      data: profile
    });
  } catch (error) {
    console.error('Create/Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving profile',
      error: error.message
    });
  }
};

// @desc    Get current user's training center profile
// @route   GET /api/training-centers/profile
// @access  Private (Training Centers only)
exports.getMyProfile = async (req, res) => {
  try {
    const profile = await TrainingCenterProfile.findOne({ user: req.user.id });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found. Please create your training center profile.'
      });
    }

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile',
      error: error.message
    });
  }
};

// @desc    Get training center profile by ID (public)
// @route   GET /api/training-centers/:id
// @access  Public
exports.getProfileById = async (req, res) => {
  try {
    const profile = await TrainingCenterProfile.findById(req.params.id)
      .populate('user', 'email');

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Training center not found'
      });
    }

    // Get courses count
    const coursesCount = await TrainingCourse.countDocuments({
      trainingCenterProfile: profile._id,
      status: 'published'
    });

    res.json({
      success: true,
      data: {
        ...profile.toObject(),
        coursesCount
      }
    });
  } catch (error) {
    console.error('Get profile by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching training center',
      error: error.message
    });
  }
};

// @desc    Get training center profile by User ID (public)
// @route   GET /api/training-centers/user/:userId
// @access  Public
exports.getProfileByUserId = async (req, res) => {
  try {
    const profile = await TrainingCenterProfile.findOne({ user: req.params.userId })
      .populate('user', 'email');

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Training center not found'
      });
    }

    // Get courses count and list
    const [coursesCount, courses] = await Promise.all([
      TrainingCourse.countDocuments({
        trainingCenterProfile: profile._id,
        status: 'published'
      }),
      TrainingCourse.find({
        trainingCenterProfile: profile._id,
        status: 'published'
      }).sort({ createdAt: -1 }).limit(10)
    ]);

    res.json({
      success: true,
      data: {
        ...profile.toObject(),
        coursesCount,
        courses
      }
    });
  } catch (error) {
    console.error('Get profile by user ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching training center',
      error: error.message
    });
  }
};

// @desc    Get all training centers (public)
// @route   GET /api/training-centers
// @access  Public
exports.getAllTrainingCenters = async (req, res) => {
  try {
    const {
      search,
      specialization,
      city,
      country,
      verified,
      page = 1,
      limit = 10
    } = req.query;

    const query = {};

    // Search by name or description
    if (search) {
      query.$or = [
        { centerName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by specialization
    if (specialization) {
      query.specializations = { $in: [specialization] };
    }

    // Filter by location
    if (city) {
      query['location.city'] = { $regex: city, $options: 'i' };
    }
    if (country) {
      query['location.country'] = { $regex: country, $options: 'i' };
    }

    // Filter by verification status
    if (verified === 'true') {
      query.isVerified = true;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [trainingCenters, total] = await Promise.all([
      TrainingCenterProfile.find(query)
        .sort({ isVerified: -1, 'rating.average': -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      TrainingCenterProfile.countDocuments(query)
    ]);

    res.json({
      success: true,
      count: trainingCenters.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      data: trainingCenters
    });
  } catch (error) {
    console.error('Get all training centers error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching training centers',
      error: error.message
    });
  }
};

// @desc    Upload training center logo
// @route   POST /api/training-centers/logo
// @access  Private (Training Centers only)
exports.uploadLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image file'
      });
    }

    const result = await uploadToCloudinary(req.file.buffer, {
      folder: 'training-center-logos',
      transformation: [
        { width: 400, height: 400, crop: 'fill' }
      ]
    });

    const profile = await TrainingCenterProfile.findOneAndUpdate(
      { user: req.user.id },
      { logo: result.secure_url },
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found. Please create your profile first.'
      });
    }

    res.json({
      success: true,
      message: 'Logo uploaded successfully',
      data: {
        logoUrl: result.secure_url
      }
    });
  } catch (error) {
    console.error('Upload logo error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading logo',
      error: error.message
    });
  }
};

// @desc    Get dashboard stats for training center
// @route   GET /api/training-centers/dashboard
// @access  Private (Training Centers only)
exports.getDashboardStats = async (req, res) => {
  try {
    const profile = await TrainingCenterProfile.findOne({ user: req.user.id });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    const [
      totalCourses,
      publishedCourses,
      draftCourses,
      totalInquiries,
      pendingInquiries,
      recentInquiries
    ] = await Promise.all([
      TrainingCourse.countDocuments({ trainingCenter: req.user.id }),
      TrainingCourse.countDocuments({ trainingCenter: req.user.id, status: 'published' }),
      TrainingCourse.countDocuments({ trainingCenter: req.user.id, status: 'draft' }),
      CourseInquiry.countDocuments({ trainingCenter: req.user.id }),
      CourseInquiry.countDocuments({ trainingCenter: req.user.id, status: 'pending' }),
      CourseInquiry.find({ trainingCenter: req.user.id })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('course', 'title')
        .populate('inquirer', 'email')
    ]);

    res.json({
      success: true,
      data: {
        profile,
        stats: {
          totalCourses,
          publishedCourses,
          draftCourses,
          totalInquiries,
          pendingInquiries
        },
        recentInquiries
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard stats',
      error: error.message
    });
  }
};
