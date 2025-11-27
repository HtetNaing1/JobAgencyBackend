const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'application_received',      // Employer: new application
      'application_status',        // Job Seeker: status changed
      'application_shortlisted',   // Job Seeker: shortlisted
      'application_rejected',      // Job Seeker: rejected
      'interview_scheduled',       // Job Seeker: interview scheduled
      'interview_reminder',        // Both: interview reminder
      'feedback_received',         // Job Seeker: feedback from employer
      'job_recommendation',        // Job Seeker: new matching job
      'job_expired',              // Employer: job posting expired
      'profile_view',             // Job Seeker: profile viewed
      'welcome',                  // All: welcome notification
      'course_inquiry'            // Training Center: new course inquiry
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  // Reference to related entities
  relatedJob: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job'
  },
  relatedApplication: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application'
  },
  relatedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Link to navigate to
  link: {
    type: String
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });

// Static method to get unread count
notificationSchema.statics.getUnreadCount = async function(userId) {
  return this.countDocuments({ recipient: userId, isRead: false });
};

module.exports = mongoose.model('Notification', notificationSchema);
