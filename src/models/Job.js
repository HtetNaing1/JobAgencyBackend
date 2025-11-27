const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  employer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  employerProfile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployerProfile',
  },
  title: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true,
    maxlength: [100, 'Job title cannot exceed 100 characters'],
  },
  description: {
    type: String,
    required: [true, 'Job description is required'],
    maxlength: [5000, 'Description cannot exceed 5000 characters'],
  },
  requirements: {
    skills: [{
      type: String,
      trim: true,
    }],
    experience: {
      type: String,
      trim: true,
    },
    education: {
      type: String,
      trim: true,
    },
  },
  jobType: {
    type: String,
    enum: ['full-time', 'part-time', 'contract', 'internship', 'temporary'],
    required: [true, 'Job type is required'],
  },
  location: {
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
    remote: {
      type: Boolean,
      default: false,
    },
  },
  salary: {
    min: {
      type: Number,
      min: 0,
    },
    max: {
      type: Number,
      min: 0,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    period: {
      type: String,
      enum: ['hourly', 'monthly', 'yearly'],
      default: 'yearly',
    },
  },
  benefits: [{
    type: String,
    trim: true,
  }],
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'closed'],
    default: 'active',
  },
  applicationDeadline: {
    type: Date,
  },
  postedDate: {
    type: Date,
    default: Date.now,
  },
  applicationCount: {
    type: Number,
    default: 0,
  },
  viewCount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Indexes for search and filtering
jobSchema.index({ title: 'text', description: 'text' });
jobSchema.index({ status: 1, postedDate: -1 });
jobSchema.index({ employer: 1 });
jobSchema.index({ 'requirements.skills': 1 });
jobSchema.index({ jobType: 1 });
jobSchema.index({ 'location.city': 1, 'location.country': 1 });

// Validate salary range
jobSchema.pre('save', function(next) {
  if (this.salary && this.salary.min && this.salary.max) {
    if (this.salary.min > this.salary.max) {
      next(new Error('Minimum salary cannot be greater than maximum salary'));
    }
  }
  next();
});

module.exports = mongoose.model('Job', jobSchema);
