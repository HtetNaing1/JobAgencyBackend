const mongoose = require('mongoose');

const experienceSchema = new mongoose.Schema({
  company: {
    type: String,
    required: true,
  },
  position: {
    type: String,
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
  },
  current: {
    type: Boolean,
    default: false,
  },
  description: {
    type: String,
  },
});

const educationSchema = new mongoose.Schema({
  institution: {
    type: String,
    required: true,
  },
  degree: {
    type: String,
    required: true,
  },
  fieldOfStudy: {
    type: String,
  },
  startDate: {
    type: Date,
  },
  endDate: {
    type: Date,
  },
  grade: {
    type: String,
  },
});

const jobSeekerProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say'],
    },
    location: {
      city: String,
      state: String,
      country: String,
    },
    bio: {
      type: String,
      maxlength: 500,
    },
    skills: [{
      type: String,
      trim: true,
    }],
    experience: [experienceSchema],
    education: [educationSchema],
    resumeUrl: {
      type: String,
    },
    resumePublicId: {
      type: String,
    },
    profilePhoto: {
      type: String,
    },
    profilePhotoPublicId: {
      type: String,
    },
    linkedIn: {
      type: String,
    },
    github: {
      type: String,
    },
    portfolio: {
      type: String,
    },
    preferredJobTypes: [{
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'internship', 'remote'],
    }],
    expectedSalary: {
      min: Number,
      max: Number,
      currency: {
        type: String,
        default: 'USD',
      },
    },
    availableFrom: {
      type: Date,
    },
    isProfileComplete: {
      type: Boolean,
      default: false,
    },
    profileViews: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Calculate profile completion
jobSeekerProfileSchema.methods.calculateCompletion = function() {
  let completed = 0;
  const total = 8;

  if (this.firstName && this.lastName) completed++;
  if (this.phone) completed++;
  if (this.location?.city) completed++;
  if (this.skills?.length > 0) completed++;
  if (this.experience?.length > 0) completed++;
  if (this.education?.length > 0) completed++;
  if (this.resumeUrl) completed++;
  if (this.bio) completed++;

  return Math.round((completed / total) * 100);
};

// Update isProfileComplete before saving
jobSeekerProfileSchema.pre('save', function(next) {
  const completion = this.calculateCompletion();
  this.isProfileComplete = completion >= 75;
  next();
});

module.exports = mongoose.model('JobSeekerProfile', jobSeekerProfileSchema);
