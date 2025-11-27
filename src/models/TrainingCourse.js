const mongoose = require('mongoose');

const trainingCourseSchema = new mongoose.Schema({
  trainingCenter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  trainingCenterProfile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TrainingCenterProfile',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Course title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Course description is required']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
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
    ]
  },
  skillsTaught: [{
    type: String,
    trim: true
  }],
  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'all-levels'],
    default: 'all-levels'
  },
  duration: {
    value: {
      type: Number,
      required: true
    },
    unit: {
      type: String,
      enum: ['hours', 'days', 'weeks', 'months'],
      default: 'weeks'
    }
  },
  mode: {
    type: String,
    enum: ['online', 'in-person', 'hybrid'],
    required: true
  },
  schedule: {
    type: String, // e.g., "Mon-Fri 9AM-5PM", "Weekends only", "Self-paced"
    trim: true
  },
  price: {
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD'
    },
    isFree: {
      type: Boolean,
      default: false
    }
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  enrollmentDeadline: {
    type: Date
  },
  maxParticipants: {
    type: Number
  },
  enrolledCount: {
    type: Number,
    default: 0
  },
  prerequisites: [{
    type: String,
    trim: true
  }],
  syllabus: [{
    title: String,
    description: String,
    duration: String
  }],
  certification: {
    offered: {
      type: Boolean,
      default: false
    },
    name: String,
    issuedBy: String
  },
  instructors: [{
    name: String,
    title: String,
    bio: String
  }],
  thumbnail: {
    type: String // Cloudinary URL
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived', 'full'],
    default: 'draft'
  },
  rating: {
    average: {
      type: Number,
      default: 0
    },
    count: {
      type: Number,
      default: 0
    }
  },
  viewCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
trainingCourseSchema.index({ title: 'text', description: 'text', skillsTaught: 'text' });
trainingCourseSchema.index({ trainingCenter: 1, status: 1 });
trainingCourseSchema.index({ category: 1, mode: 1, level: 1 });
trainingCourseSchema.index({ 'price.amount': 1 });
trainingCourseSchema.index({ startDate: 1 });
trainingCourseSchema.index({ status: 1, createdAt: -1 });

// Virtual for checking if course is full
trainingCourseSchema.virtual('isFull').get(function() {
  if (!this.maxParticipants) return false;
  return this.enrolledCount >= this.maxParticipants;
});

// Virtual for checking if enrollment is open
trainingCourseSchema.virtual('isEnrollmentOpen').get(function() {
  if (this.status !== 'published') return false;
  if (this.isFull) return false;
  if (this.enrollmentDeadline && new Date() > this.enrollmentDeadline) return false;
  return true;
});

module.exports = mongoose.model('TrainingCourse', trainingCourseSchema);
