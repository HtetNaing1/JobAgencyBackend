const EmployerProfile = require('../models/EmployerProfile');
const Job = require('../models/Job');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

// @desc    Create or update employer profile
// @route   POST /api/employers/profile
// @access  Private (Employer only)
exports.createOrUpdateProfile = async (req, res) => {
  try {
    const {
      companyName,
      industry,
      companySize,
      foundedYear,
      location,
      website,
      description,
      contactPerson,
      socialLinks,
      benefits,
      culture,
    } = req.body;

    // Check if profile exists
    let profile = await EmployerProfile.findOne({ user: req.user._id });

    const profileData = {
      user: req.user._id,
      companyName,
      industry,
      companySize,
      foundedYear,
      location,
      website,
      description,
      contactPerson,
      socialLinks,
      benefits: benefits ? (Array.isArray(benefits) ? benefits : benefits.split(',').map(b => b.trim())) : [],
      culture,
    };

    if (profile) {
      // Update existing profile
      profile = await EmployerProfile.findOneAndUpdate(
        { user: req.user._id },
        profileData,
        { new: true, runValidators: true }
      );
    } else {
      // Create new profile
      profile = await EmployerProfile.create(profileData);
    }

    res.status(200).json({
      success: true,
      message: profile ? 'Profile updated successfully' : 'Profile created successfully',
      data: profile,
      completion: profile.calculateCompletion(),
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving profile',
      error: error.message,
    });
  }
};

// @desc    Get current employer's profile
// @route   GET /api/employers/profile
// @access  Private (Employer only)
exports.getProfile = async (req, res) => {
  try {
    const profile = await EmployerProfile.findOne({ user: req.user._id });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found. Please create your company profile.',
      });
    }

    res.status(200).json({
      success: true,
      data: profile,
      completion: profile.calculateCompletion(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching profile',
      error: error.message,
    });
  }
};

// @desc    Get employer profile by ID (public view)
// @route   GET /api/employers/profile/:userId
// @access  Public
exports.getProfileById = async (req, res) => {
  try {
    const profile = await EmployerProfile.findOne({ user: req.params.userId })
      .select('-logoPublicId -coverImagePublicId');

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Company profile not found',
      });
    }

    // Get job statistics for this employer
    const [totalJobs, activeJobs] = await Promise.all([
      Job.countDocuments({ employer: req.params.userId }),
      Job.countDocuments({ employer: req.params.userId, status: 'active' })
    ]);

    res.status(200).json({
      success: true,
      data: {
        ...profile.toObject(),
        stats: {
          totalJobs,
          activeJobs
        }
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching profile',
      error: error.message,
    });
  }
};

// @desc    Get jobs by employer ID (public view)
// @route   GET /api/employers/:userId/jobs
// @access  Public
exports.getEmployerJobs = async (req, res) => {
  try {
    const { page = 1, limit = 10, status = 'active' } = req.query;

    const query = { employer: req.params.userId };
    if (status !== 'all') {
      query.status = status;
    }

    const [jobs, total] = await Promise.all([
      Job.find(query)
        .select('title jobType location salary postedDate applicationDeadline applicationCount status')
        .sort({ postedDate: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      Job.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: jobs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching employer jobs',
      error: error.message,
    });
  }
};

// @desc    Upload company logo
// @route   POST /api/employers/logo
// @access  Private (Employer only)
exports.uploadLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image file',
      });
    }

    let profile = await EmployerProfile.findOne({ user: req.user._id });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Please create your company profile first',
      });
    }

    // Delete old logo from Cloudinary if exists
    if (profile.logoPublicId) {
      await cloudinary.uploader.destroy(profile.logoPublicId);
    }

    // Upload new logo to Cloudinary
    const uploadPromise = new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'job-agency/company-logos',
          public_id: `logo_${req.user._id}_${Date.now()}`,
          transformation: [
            { width: 200, height: 200, crop: 'fill' },
            { quality: 'auto' },
          ],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
    });

    const result = await uploadPromise;

    // Update profile with logo URL
    profile.logo = result.secure_url;
    profile.logoPublicId = result.public_id;
    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Logo uploaded successfully',
      data: {
        logo: result.secure_url,
      },
    });
  } catch (error) {
    console.error('Logo upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading logo',
      error: error.message,
    });
  }
};

// @desc    Upload cover image
// @route   POST /api/employers/cover
// @access  Private (Employer only)
exports.uploadCoverImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image file',
      });
    }

    let profile = await EmployerProfile.findOne({ user: req.user._id });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Please create your company profile first',
      });
    }

    // Delete old cover image from Cloudinary if exists
    if (profile.coverImagePublicId) {
      await cloudinary.uploader.destroy(profile.coverImagePublicId);
    }

    // Upload new cover image to Cloudinary
    const uploadPromise = new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'job-agency/company-covers',
          public_id: `cover_${req.user._id}_${Date.now()}`,
          transformation: [
            { width: 1200, height: 300, crop: 'fill' },
            { quality: 'auto' },
          ],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
    });

    const result = await uploadPromise;

    // Update profile with cover image URL
    profile.coverImage = result.secure_url;
    profile.coverImagePublicId = result.public_id;
    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Cover image uploaded successfully',
      data: {
        coverImage: result.secure_url,
      },
    });
  } catch (error) {
    console.error('Cover image upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading cover image',
      error: error.message,
    });
  }
};

// @desc    Get all employers (for public listing)
// @route   GET /api/employers
// @access  Public
exports.getAllEmployers = async (req, res) => {
  try {
    const { page = 1, limit = 10, industry, search } = req.query;

    const query = { isProfileComplete: true };

    if (industry) {
      query.industry = industry;
    }

    if (search) {
      query.companyName = { $regex: search, $options: 'i' };
    }

    const profiles = await EmployerProfile.find(query)
      .select('companyName industry companySize location logo description')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await EmployerProfile.countDocuments(query);

    res.status(200).json({
      success: true,
      data: profiles,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching employers',
      error: error.message,
    });
  }
};
