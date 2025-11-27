const Notification = require('../models/Notification');

/**
 * Create a notification
 * @param {Object} options
 * @param {string} options.recipient - User ID of the recipient
 * @param {string} options.type - Notification type
 * @param {string} options.title - Notification title
 * @param {string} options.message - Notification message
 * @param {string} [options.relatedJob] - Related job ID
 * @param {string} [options.relatedApplication] - Related application ID
 * @param {string} [options.relatedUser] - Related user ID
 * @param {string} [options.link] - Link to navigate to
 */
const createNotification = async (options) => {
  try {
    const notification = await Notification.create({
      recipient: options.recipient,
      type: options.type,
      title: options.title,
      message: options.message,
      relatedJob: options.relatedJob,
      relatedApplication: options.relatedApplication,
      relatedUser: options.relatedUser,
      link: options.link
    });
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

// Pre-defined notification creators for common events

const notifyApplicationReceived = async (employerId, jobSeekerId, jobId, applicationId, jobTitle, applicantName) => {
  return createNotification({
    recipient: employerId,
    type: 'application_received',
    title: 'New Application Received',
    message: `${applicantName} has applied for ${jobTitle}`,
    relatedJob: jobId,
    relatedApplication: applicationId,
    relatedUser: jobSeekerId,
    link: `/dashboard/employer/applications`
  });
};

const notifyApplicationStatus = async (jobSeekerId, applicationId, jobId, jobTitle, companyName, status) => {
  const statusMessages = {
    reviewed: `Your application for ${jobTitle} at ${companyName} has been reviewed`,
    shortlisted: `Great news! You've been shortlisted for ${jobTitle} at ${companyName}`,
    interview: `You've been selected for an interview for ${jobTitle} at ${companyName}`,
    rejected: `Your application for ${jobTitle} at ${companyName} was not selected`,
    hired: `Congratulations! You've been hired for ${jobTitle} at ${companyName}`
  };

  const statusTitles = {
    reviewed: 'Application Reviewed',
    shortlisted: 'You\'ve Been Shortlisted!',
    interview: 'Interview Invitation',
    rejected: 'Application Update',
    hired: 'Congratulations!'
  };

  return createNotification({
    recipient: jobSeekerId,
    type: status === 'shortlisted' ? 'application_shortlisted' :
          status === 'rejected' ? 'application_rejected' : 'application_status',
    title: statusTitles[status] || 'Application Update',
    message: statusMessages[status] || `Your application status has been updated to ${status}`,
    relatedJob: jobId,
    relatedApplication: applicationId,
    link: `/applications`
  });
};

const notifyInterviewScheduled = async (jobSeekerId, applicationId, jobId, jobTitle, companyName, interviewDate) => {
  const formattedDate = new Date(interviewDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });

  return createNotification({
    recipient: jobSeekerId,
    type: 'interview_scheduled',
    title: 'Interview Scheduled',
    message: `Your interview for ${jobTitle} at ${companyName} is scheduled for ${formattedDate}`,
    relatedJob: jobId,
    relatedApplication: applicationId,
    link: `/applications`
  });
};

const notifyFeedbackReceived = async (jobSeekerId, applicationId, jobId, jobTitle, companyName) => {
  return createNotification({
    recipient: jobSeekerId,
    type: 'feedback_received',
    title: 'Feedback Received',
    message: `${companyName} has provided feedback on your application for ${jobTitle}`,
    relatedJob: jobId,
    relatedApplication: applicationId,
    link: `/applications`
  });
};

const notifyJobRecommendation = async (jobSeekerId, jobId, jobTitle, companyName, matchScore) => {
  return createNotification({
    recipient: jobSeekerId,
    type: 'job_recommendation',
    title: 'New Job Match',
    message: `${jobTitle} at ${companyName} matches your profile (${matchScore}% match)`,
    relatedJob: jobId,
    link: `/jobs/${jobId}`
  });
};

const notifyWelcome = async (userId, role) => {
  const roleMessages = {
    jobseeker: 'Welcome to JobAgency! Complete your profile to start applying for jobs.',
    employer: 'Welcome to JobAgency! Set up your company profile to start posting jobs.',
    training_center: 'Welcome to JobAgency! Create your center profile to showcase your courses.'
  };

  return createNotification({
    recipient: userId,
    type: 'welcome',
    title: 'Welcome to JobAgency!',
    message: roleMessages[role] || 'Welcome to JobAgency!',
    link: '/profile'
  });
};

const notifyEmployerBanned = async (jobSeekerId, companyName, jobTitle) => {
  return createNotification({
    recipient: jobSeekerId,
    type: 'employer_banned',
    title: 'Employer Removed from Platform',
    message: `${companyName} has been removed from the platform. Your application for "${jobTitle}" is no longer active.`,
    link: '/applications'
  });
};

const notifyTrainingCenterBanned = async (jobSeekerId, centerName, courseTitle) => {
  return createNotification({
    recipient: jobSeekerId,
    type: 'training_center_banned',
    title: 'Training Center Removed from Platform',
    message: `${centerName} has been removed from the platform. Your enrollment for "${courseTitle}" is no longer active.`,
    link: '/my-courses'
  });
};

module.exports = {
  createNotification,
  notifyApplicationReceived,
  notifyApplicationStatus,
  notifyInterviewScheduled,
  notifyFeedbackReceived,
  notifyJobRecommendation,
  notifyWelcome,
  notifyEmployerBanned,
  notifyTrainingCenterBanned
};
