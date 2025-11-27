const TrainingCourse = require('../models/TrainingCourse');
const TrainingCenterProfile = require('../models/TrainingCenterProfile');
const CourseInquiry = require('../models/CourseInquiry');
const { createNotification } = require('../utils/createNotification');

// @desc    Create a new course
// @route   POST /api/courses
// @access  Private (Training Centers only)
exports.createCourse = async (req, res) => {
  try {
    const profile = await TrainingCenterProfile.findOne({ user: req.user.id });

    if (!profile) {
      return res.status(400).json({
        success: false,
        message: 'Please create your training center profile first'
      });
    }

    const courseData = {
      ...req.body,
      trainingCenter: req.user.id,
      trainingCenterProfile: profile._id
    };

    const course = await TrainingCourse.create(courseData);

    // Update total courses count
    await TrainingCenterProfile.findByIdAndUpdate(profile._id, {
      $inc: { totalCourses: 1 }
    });

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: course
    });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating course',
      error: error.message
    });
  }
};

// @desc    Get all courses for the current training center
// @route   GET /api/courses/my-courses
// @access  Private (Training Centers only)
exports.getMyCourses = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const query = { trainingCenter: req.user.id };
    if (status) {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [courses, total] = await Promise.all([
      TrainingCourse.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      TrainingCourse.countDocuments(query)
    ]);

    res.json({
      success: true,
      count: courses.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      data: courses
    });
  } catch (error) {
    console.error('Get my courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching courses',
      error: error.message
    });
  }
};

// @desc    Get single course by ID
// @route   GET /api/courses/:id
// @access  Public
exports.getCourseById = async (req, res) => {
  try {
    const course = await TrainingCourse.findById(req.params.id)
      .populate('trainingCenterProfile', 'centerName logo location contactInfo isVerified rating');

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Increment view count
    course.viewCount += 1;
    await course.save();

    res.json({
      success: true,
      data: course
    });
  } catch (error) {
    console.error('Get course by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching course',
      error: error.message
    });
  }
};

// @desc    Update a course
// @route   PUT /api/courses/:id
// @access  Private (Training Centers only)
exports.updateCourse = async (req, res) => {
  try {
    let course = await TrainingCourse.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check ownership
    if (course.trainingCenter.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this course'
      });
    }

    course = await TrainingCourse.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Course updated successfully',
      data: course
    });
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating course',
      error: error.message
    });
  }
};

// @desc    Delete a course
// @route   DELETE /api/courses/:id
// @access  Private (Training Centers only)
exports.deleteCourse = async (req, res) => {
  try {
    const course = await TrainingCourse.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check ownership
    if (course.trainingCenter.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this course'
      });
    }

    await course.deleteOne();

    // Update total courses count
    await TrainingCenterProfile.findOneAndUpdate(
      { user: req.user.id },
      { $inc: { totalCourses: -1 } }
    );

    res.json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting course',
      error: error.message
    });
  }
};

// @desc    Get all published courses (marketplace)
// @route   GET /api/courses
// @access  Public
exports.getAllCourses = async (req, res) => {
  try {
    const {
      search,
      category,
      mode,
      level,
      minPrice,
      maxPrice,
      isFree,
      city,
      sortBy = 'newest',
      page = 1,
      limit = 12
    } = req.query;

    const query = { status: 'published' };

    // Search by title, description, or skills
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { skillsTaught: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Filter by mode
    if (mode) {
      query.mode = mode;
    }

    // Filter by level
    if (level) {
      query.level = level;
    }

    // Filter by price
    if (isFree === 'true') {
      query['price.isFree'] = true;
    } else {
      if (minPrice) {
        query['price.amount'] = { ...query['price.amount'], $gte: parseFloat(minPrice) };
      }
      if (maxPrice) {
        query['price.amount'] = { ...query['price.amount'], $lte: parseFloat(maxPrice) };
      }
    }

    // Sorting
    let sort = {};
    switch (sortBy) {
      case 'newest':
        sort = { createdAt: -1 };
        break;
      case 'oldest':
        sort = { createdAt: 1 };
        break;
      case 'price_low':
        sort = { 'price.amount': 1 };
        break;
      case 'price_high':
        sort = { 'price.amount': -1 };
        break;
      case 'popular':
        sort = { viewCount: -1 };
        break;
      case 'rating':
        sort = { 'rating.average': -1 };
        break;
      default:
        sort = { createdAt: -1 };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [courses, total] = await Promise.all([
      TrainingCourse.find(query)
        .populate('trainingCenterProfile', 'centerName logo isVerified')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      TrainingCourse.countDocuments(query)
    ]);

    res.json({
      success: true,
      count: courses.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      data: courses
    });
  } catch (error) {
    console.error('Get all courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching courses',
      error: error.message
    });
  }
};

// @desc    Get courses by training center
// @route   GET /api/courses/center/:centerId
// @access  Public
exports.getCoursesByCenter = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [courses, total] = await Promise.all([
      TrainingCourse.find({
        trainingCenterProfile: req.params.centerId,
        status: 'published'
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      TrainingCourse.countDocuments({
        trainingCenterProfile: req.params.centerId,
        status: 'published'
      })
    ]);

    res.json({
      success: true,
      count: courses.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      data: courses
    });
  } catch (error) {
    console.error('Get courses by center error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching courses',
      error: error.message
    });
  }
};

// @desc    Submit course inquiry
// @route   POST /api/courses/:id/inquiry
// @access  Private (Job Seekers and Employers)
exports.submitInquiry = async (req, res) => {
  try {
    const course = await TrainingCourse.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    const { name, email, phone, message, companyName, numberOfParticipants } = req.body;

    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and message are required'
      });
    }

    // Check if user already has a pending inquiry for this course
    const existingInquiry = await CourseInquiry.findOne({
      course: course._id,
      inquirer: req.user.id,
      status: 'pending'
    });

    if (existingInquiry) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending inquiry for this course'
      });
    }

    const inquiry = await CourseInquiry.create({
      course: course._id,
      trainingCenter: course.trainingCenter,
      inquirer: req.user.id,
      inquirerRole: req.user.role,
      name,
      email,
      phone,
      message,
      companyName,
      numberOfParticipants
    });

    // Create notification for training center
    await createNotification({
      recipient: course.trainingCenter,
      type: 'course_inquiry',
      title: 'New Course Inquiry',
      message: `You have a new inquiry for "${course.title}" from ${name}`,
      link: `/dashboard/training-center/inquiries`
    });

    res.status(201).json({
      success: true,
      message: 'Inquiry submitted successfully. The training center will contact you soon.',
      data: inquiry
    });
  } catch (error) {
    console.error('Submit inquiry error:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting inquiry',
      error: error.message
    });
  }
};

// @desc    Get inquiries for training center
// @route   GET /api/courses/inquiries
// @access  Private (Training Centers only)
exports.getInquiries = async (req, res) => {
  try {
    const { status, courseId, page = 1, limit = 10 } = req.query;

    const query = { trainingCenter: req.user.id };

    if (status) {
      query.status = status;
    }

    if (courseId) {
      query.course = courseId;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [inquiries, total] = await Promise.all([
      CourseInquiry.find(query)
        .populate('course', 'title category')
        .populate('inquirer', 'email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      CourseInquiry.countDocuments(query)
    ]);

    res.json({
      success: true,
      count: inquiries.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      data: inquiries
    });
  } catch (error) {
    console.error('Get inquiries error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching inquiries',
      error: error.message
    });
  }
};

// @desc    Update inquiry status
// @route   PUT /api/courses/inquiries/:inquiryId
// @access  Private (Training Centers only)
exports.updateInquiryStatus = async (req, res) => {
  try {
    const { status, notes, responseMessage } = req.body;

    let inquiry = await CourseInquiry.findById(req.params.inquiryId);

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found'
      });
    }

    // Check ownership
    if (inquiry.trainingCenter.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this inquiry'
      });
    }

    const previousStatus = inquiry.status;

    if (status) {
      inquiry.status = status;

      // Update enrolledCount on the course when status changes to/from enrolled
      if (status === 'enrolled' && previousStatus !== 'enrolled') {
        // Increment enrolled count
        await TrainingCourse.findByIdAndUpdate(inquiry.course, {
          $inc: { enrolledCount: 1 }
        });
      } else if (previousStatus === 'enrolled' && status !== 'enrolled') {
        // Decrement enrolled count (if someone is un-enrolled)
        await TrainingCourse.findByIdAndUpdate(inquiry.course, {
          $inc: { enrolledCount: -1 }
        });
      }
    }
    if (notes !== undefined) {
      inquiry.notes = notes;
    }
    if (responseMessage) {
      inquiry.response = {
        message: responseMessage,
        respondedAt: new Date()
      };
    }

    await inquiry.save();

    res.json({
      success: true,
      message: 'Inquiry updated successfully',
      data: inquiry
    });
  } catch (error) {
    console.error('Update inquiry status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating inquiry',
      error: error.message
    });
  }
};

// @desc    Get course categories
// @route   GET /api/courses/categories
// @access  Public
exports.getCategories = async (req, res) => {
  try {
    const categories = [
      'Programming & Development',
      'Data Science & Analytics',
      'Cloud Computing',
      'Cybersecurity',
      'Project Management',
      'Business & Management',
      'Design & Creative',
      'Marketing & Sales',
      'Finance & Accounting',
      'Healthcare',
      'Language & Communication',
      'Personal Development',
      'Other'
    ];

    // Get count of courses per category
    const categoryCounts = await TrainingCourse.aggregate([
      { $match: { status: 'published' } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    const categoryCountMap = categoryCounts.reduce((acc, cat) => {
      acc[cat._id] = cat.count;
      return acc;
    }, {});

    const result = categories.map(cat => ({
      name: cat,
      count: categoryCountMap[cat] || 0
    }));

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: error.message
    });
  }
};

// @desc    Get user's inquiry for a specific course
// @route   GET /api/courses/:id/my-inquiry
// @access  Private (Job Seekers only)
exports.getMyInquiryForCourse = async (req, res) => {
  try {
    const inquiry = await CourseInquiry.findOne({
      course: req.params.id,
      inquirer: req.user.id
    });

    res.json({
      success: true,
      data: inquiry
    });
  } catch (error) {
    console.error('Get my inquiry error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching inquiry',
      error: error.message
    });
  }
};

// @desc    Get all course inquiries for current user (job seeker)
// @route   GET /api/courses/user/inquiries
// @access  Private (Job Seekers only)
exports.getUserInquiries = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const query = { inquirer: req.user.id };
    if (status) {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [inquiries, total] = await Promise.all([
      CourseInquiry.find(query)
        .populate({
          path: 'course',
          select: 'title category level mode duration price certification trainingCenterProfile',
          populate: {
            path: 'trainingCenterProfile',
            select: 'centerName location isVerified'
          }
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      CourseInquiry.countDocuments(query)
    ]);

    res.json({
      success: true,
      count: inquiries.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      data: inquiries
    });
  } catch (error) {
    console.error('Get user inquiries error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching inquiries',
      error: error.message
    });
  }
};
