const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  jobSeeker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  employer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'shortlisted', 'interview', 'rejected', 'hired', 'withdrawn'],
    default: 'pending'
  },
  appliedDate: {
    type: Date,
    default: Date.now
  },
  resumeUrl: {
    type: String
  },
  coverLetter: {
    text: {
      type: String,
      maxlength: 2000
    },
    fileUrl: {
      type: String
    },
    fileName: {
      type: String
    }
  },
  // Employer feedback
  feedback: {
    message: String,
    category: String,
    providedAt: Date
  },
  // Interview details (if scheduled)
  interview: {
    scheduledDate: Date,
    location: String,
    meetingLink: String,
    notes: String,
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'rescheduled'],
    }
  },
  // Status history for tracking
  statusHistory: [{
    status: String,
    changedAt: {
      type: Date,
      default: Date.now
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    note: String
  }],
  // Job seeker's profile snapshot at application time
  profileSnapshot: {
    firstName: String,
    lastName: String,
    skills: [String],
    experience: String,
    education: String
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate applications
applicationSchema.index({ job: 1, jobSeeker: 1 }, { unique: true });

// Index for efficient queries
applicationSchema.index({ employer: 1, status: 1 });
applicationSchema.index({ jobSeeker: 1, status: 1 });
applicationSchema.index({ job: 1, status: 1 });
applicationSchema.index({ appliedDate: -1 });

// Pre-save hook to add status change to history
applicationSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    this.statusHistory.push({
      status: this.status,
      changedAt: new Date()
    });
  }
  next();
});

module.exports = mongoose.model('Application', applicationSchema);
