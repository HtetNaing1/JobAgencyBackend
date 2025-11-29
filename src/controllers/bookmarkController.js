const Bookmark = require('../models/Bookmark');
const Job = require('../models/Job');
const TrainingCourse = require('../models/TrainingCourse');

exports.addBookmark = async (req, res) => {
  try {
    const { itemType, itemId } = req.body;

    if (!itemType || !itemId) {
      return res.status(400).json({
        success: false,
        message: 'Item type and item ID are required'
      });
    }

    if (!['job', 'course'].includes(itemType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid item type. Must be "job" or "course"'
      });
    }

    // Verify the item exists
    if (itemType === 'job') {
      const job = await Job.findById(itemId);
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }
    } else {
      const course = await TrainingCourse.findById(itemId);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }
    }

    // Check if already bookmarked
    const existingBookmark = await Bookmark.findOne({
      user: req.user.id,
      itemType,
      itemId
    });

    if (existingBookmark) {
      return res.status(400).json({
        success: false,
        message: 'Item already bookmarked'
      });
    }

    // Create bookmark
    const bookmarkData = {
      user: req.user.id,
      itemType,
      itemId
    };

    const bookmark = await Bookmark.create(bookmarkData);

    res.status(201).json({
      success: true,
      message: 'Bookmark added successfully',
      data: bookmark
    });
  } catch (error) {
    console.error('Add bookmark error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding bookmark',
      error: error.message
    });
  }
};

exports.removeBookmark = async (req, res) => {
  try {
    const { itemType, itemId } = req.params;

    if (!['job', 'course'].includes(itemType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid item type'
      });
    }

    const bookmark = await Bookmark.findOneAndDelete({
      user: req.user.id,
      itemType,
      itemId
    });

    if (!bookmark) {
      return res.status(404).json({
        success: false,
        message: 'Bookmark not found'
      });
    }

    res.json({
      success: true,
      message: 'Bookmark removed successfully'
    });
  } catch (error) {
    console.error('Remove bookmark error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing bookmark',
      error: error.message
    });
  }
};

exports.getMyBookmarks = async (req, res) => {
  try {
    const { type, page = 1, limit = 10 } = req.query;

    const query = { user: req.user.id };

    if (type && ['job', 'course'].includes(type)) {
      query.itemType = type;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [bookmarks, total] = await Promise.all([
      Bookmark.find(query)
        .populate({
          path: 'job',
          select: 'title description jobType location salary status applicationDeadline employerProfile',
          populate: {
            path: 'employerProfile',
            select: 'companyName logo'
          }
        })
        .populate({
          path: 'course',
          select: 'title description category level duration mode price status trainingCenterProfile',
          populate: {
            path: 'trainingCenterProfile',
            select: 'centerName logo'
          }
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Bookmark.countDocuments(query)
    ]);

    // Filter out bookmarks where the item no longer exists
    const validBookmarks = bookmarks.filter(b =>
      (b.itemType === 'job' && b.job) ||
      (b.itemType === 'course' && b.course)
    );

    res.json({
      success: true,
      count: validBookmarks.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      data: validBookmarks
    });
  } catch (error) {
    console.error('Get bookmarks error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bookmarks',
      error: error.message
    });
  }
};

exports.checkBookmark = async (req, res) => {
  try {
    const { itemType, itemId } = req.params;

    if (!['job', 'course'].includes(itemType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid item type'
      });
    }

    const bookmark = await Bookmark.findOne({
      user: req.user.id,
      itemType,
      itemId
    });

    res.json({
      success: true,
      isBookmarked: !!bookmark
    });
  } catch (error) {
    console.error('Check bookmark error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking bookmark',
      error: error.message
    });
  }
};

exports.toggleBookmark = async (req, res) => {
  try {
    const { itemType, itemId } = req.body;

    if (!itemType || !itemId) {
      return res.status(400).json({
        success: false,
        message: 'Item type and item ID are required'
      });
    }

    if (!['job', 'course'].includes(itemType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid item type'
      });
    }

    // Check if already bookmarked
    const existingBookmark = await Bookmark.findOne({
      user: req.user.id,
      itemType,
      itemId
    });

    if (existingBookmark) {
      // Remove bookmark
      await Bookmark.findByIdAndDelete(existingBookmark._id);
      return res.json({
        success: true,
        message: 'Bookmark removed',
        isBookmarked: false
      });
    }

    // Verify the item exists before bookmarking
    if (itemType === 'job') {
      const job = await Job.findById(itemId);
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }
    } else {
      const course = await TrainingCourse.findById(itemId);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }
    }

    // Create bookmark
    const bookmarkData = {
      user: req.user.id,
      itemType,
      itemId
    };

    await Bookmark.create(bookmarkData);

    res.json({
      success: true,
      message: 'Bookmark added',
      isBookmarked: true
    });
  } catch (error) {
    console.error('Toggle bookmark error:', error);
    res.status(500).json({
      success: false,
      message: 'Error toggling bookmark',
      error: error.message
    });
  }
};

exports.getBookmarkIds = async (req, res) => {
  try {
    const { type } = req.query;

    const query = { user: req.user.id };

    if (type && ['job', 'course'].includes(type)) {
      query.itemType = type;
    }

    const bookmarks = await Bookmark.find(query).select('itemType itemId');

    const jobIds = bookmarks
      .filter(b => b.itemType === 'job' && b.itemId)
      .map(b => b.itemId.toString());

    const courseIds = bookmarks
      .filter(b => b.itemType === 'course' && b.itemId)
      .map(b => b.itemId.toString());

    res.json({
      success: true,
      data: {
        jobs: jobIds,
        courses: courseIds
      }
    });
  } catch (error) {
    console.error('Get bookmark IDs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bookmark IDs',
      error: error.message
    });
  }
};
