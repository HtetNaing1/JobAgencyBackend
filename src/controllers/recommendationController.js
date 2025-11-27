const { getJobRecommendations, getSimilarJobs } = require('../utils/jobRecommendation');

// @desc    Get personalized job recommendations
// @route   GET /api/recommendations
// @access  Private (Job Seekers)
exports.getRecommendations = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const recommendations = await getJobRecommendations(req.user.id, limit);

    res.json({
      success: true,
      count: recommendations.length,
      data: recommendations
    });
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching recommendations',
      error: error.message
    });
  }
};

// @desc    Get similar jobs to a specific job
// @route   GET /api/recommendations/similar/:jobId
// @access  Public
exports.getSimilar = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const similarJobs = await getSimilarJobs(req.params.jobId, limit);

    res.json({
      success: true,
      count: similarJobs.length,
      data: similarJobs
    });
  } catch (error) {
    console.error('Get similar jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching similar jobs',
      error: error.message
    });
  }
};
