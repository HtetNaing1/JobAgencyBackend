const JobSeekerProfile = require('../models/JobSeekerProfile');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

// @desc    Create or update job seeker profile
// @route   POST /api/jobseekers/profile
// @access  Private (Job Seeker only)
exports.createOrUpdateProfile = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      phone,
      dateOfBirth,
      gender,
      location,
      bio,
      skills,
      experience,
      education,
      linkedIn,
      github,
      portfolio,
      preferredJobTypes,
      expectedSalary,
      availableFrom,
    } = req.body;

    // Check if profile exists
    let profile = await JobSeekerProfile.findOne({ user: req.user._id });

    const profileData = {
      user: req.user._id,
      firstName,
      lastName,
      phone,
      dateOfBirth,
      gender,
      location,
      bio,
      skills: skills ? (Array.isArray(skills) ? skills : skills.split(',').map(s => s.trim())) : [],
      experience,
      education,
      linkedIn,
      github,
      portfolio,
      preferredJobTypes,
      expectedSalary,
      availableFrom,
    };

    if (profile) {
      // Update existing profile
      profile = await JobSeekerProfile.findOneAndUpdate(
        { user: req.user._id },
        profileData,
        { new: true, runValidators: true }
      );
    } else {
      // Create new profile
      profile = await JobSeekerProfile.create(profileData);
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

// @desc    Get current user's profile
// @route   GET /api/jobseekers/profile
// @access  Private (Job Seeker only)
exports.getProfile = async (req, res) => {
  try {
    const profile = await JobSeekerProfile.findOne({ user: req.user._id });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found. Please create your profile.',
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

// @desc    Get profile by user ID (public view)
// @route   GET /api/jobseekers/profile/:userId
// @access  Private (Employers only)
exports.getProfileById = async (req, res) => {
  try {
    const profile = await JobSeekerProfile.findOne({ user: req.params.userId })
      .select('-resumePublicId -profilePhotoPublicId');

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found',
      });
    }

    // Increment profile views
    profile.profileViews += 1;
    await profile.save();

    res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching profile',
      error: error.message,
    });
  }
};

// @desc    Upload resume
// @route   POST /api/jobseekers/resume
// @access  Private (Job Seeker only)
exports.uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a PDF file',
      });
    }

    let profile = await JobSeekerProfile.findOne({ user: req.user._id });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Please create your profile first',
      });
    }

    // Delete old resume from Cloudinary if exists
    if (profile.resumePublicId) {
      await cloudinary.uploader.destroy(profile.resumePublicId, { resource_type: 'raw' });
    }

    // Upload new resume to Cloudinary
    const uploadPromise = new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'job-agency/resumes',
          resource_type: 'raw',
          public_id: `resume_${req.user._id}_${Date.now()}`,
          format: 'pdf',
          type: 'upload',
          access_mode: 'public',
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
    });

    const result = await uploadPromise;

    // Update profile with resume URL
    profile.resumeUrl = result.secure_url;
    profile.resumePublicId = result.public_id;
    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Resume uploaded successfully',
      data: {
        resumeUrl: result.secure_url,
      },
    });
  } catch (error) {
    console.error('Resume upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading resume',
      error: error.message,
    });
  }
};

// @desc    Delete resume
// @route   DELETE /api/jobseekers/resume
// @access  Private (Job Seeker only)
exports.deleteResume = async (req, res) => {
  try {
    const profile = await JobSeekerProfile.findOne({ user: req.user._id });

    if (!profile || !profile.resumePublicId) {
      return res.status(404).json({
        success: false,
        message: 'No resume found',
      });
    }

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(profile.resumePublicId, { resource_type: 'raw' });

    // Update profile
    profile.resumeUrl = undefined;
    profile.resumePublicId = undefined;
    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Resume deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting resume',
      error: error.message,
    });
  }
};

// @desc    Upload profile photo
// @route   POST /api/jobseekers/photo
// @access  Private (Job Seeker only)
exports.uploadPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image file',
      });
    }

    let profile = await JobSeekerProfile.findOne({ user: req.user._id });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Please create your profile first',
      });
    }

    // Delete old photo from Cloudinary if exists
    if (profile.profilePhotoPublicId) {
      await cloudinary.uploader.destroy(profile.profilePhotoPublicId);
    }

    // Upload new photo to Cloudinary
    const uploadPromise = new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'job-agency/profile-photos',
          public_id: `photo_${req.user._id}_${Date.now()}`,
          transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
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

    // Update profile with photo URL
    profile.profilePhoto = result.secure_url;
    profile.profilePhotoPublicId = result.public_id;
    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Photo uploaded successfully',
      data: {
        profilePhoto: result.secure_url,
      },
    });
  } catch (error) {
    console.error('Photo upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading photo',
      error: error.message,
    });
  }
};

// @desc    Add experience
// @route   POST /api/jobseekers/experience
// @access  Private (Job Seeker only)
exports.addExperience = async (req, res) => {
  try {
    const profile = await JobSeekerProfile.findOne({ user: req.user._id });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Please create your profile first',
      });
    }

    profile.experience.push(req.body);
    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Experience added successfully',
      data: profile.experience,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding experience',
      error: error.message,
    });
  }
};

// @desc    Delete experience
// @route   DELETE /api/jobseekers/experience/:expId
// @access  Private (Job Seeker only)
exports.deleteExperience = async (req, res) => {
  try {
    const profile = await JobSeekerProfile.findOne({ user: req.user._id });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found',
      });
    }

    profile.experience = profile.experience.filter(
      (exp) => exp._id.toString() !== req.params.expId
    );
    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Experience deleted successfully',
      data: profile.experience,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting experience',
      error: error.message,
    });
  }
};

// @desc    Add education
// @route   POST /api/jobseekers/education
// @access  Private (Job Seeker only)
exports.addEducation = async (req, res) => {
  try {
    const profile = await JobSeekerProfile.findOne({ user: req.user._id });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Please create your profile first',
      });
    }

    profile.education.push(req.body);
    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Education added successfully',
      data: profile.education,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding education',
      error: error.message,
    });
  }
};

// @desc    Delete education
// @route   DELETE /api/jobseekers/education/:eduId
// @access  Private (Job Seeker only)
exports.deleteEducation = async (req, res) => {
  try {
    const profile = await JobSeekerProfile.findOne({ user: req.user._id });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found',
      });
    }

    profile.education = profile.education.filter(
      (edu) => edu._id.toString() !== req.params.eduId
    );
    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Education deleted successfully',
      data: profile.education,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting education',
      error: error.message,
    });
  }
};

