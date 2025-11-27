const mongoose = require('mongoose');

const trainingCenterProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  centerName: {
    type: String,
    required: [true, 'Training center name is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  specializations: [{
    type: String,
    trim: true
  }],
  location: {
    address: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },
  contactInfo: {
    phone: String,
    email: String,
    website: String
  },
  logo: {
    type: String // Cloudinary URL
  },
  accreditations: [{
    name: String,
    issuedBy: String,
    year: Number
  }],
  establishedYear: {
    type: Number
  },
  socialMedia: {
    linkedin: String,
    facebook: String,
    twitter: String,
    instagram: String
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedAt: {
    type: Date
  },
  totalCourses: {
    type: Number,
    default: 0
  },
  totalStudents: {
    type: Number,
    default: 0
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
  }
}, {
  timestamps: true
});

// Index for searching
trainingCenterProfileSchema.index({ centerName: 'text', description: 'text', specializations: 'text' });
trainingCenterProfileSchema.index({ 'location.city': 1, 'location.country': 1 });
trainingCenterProfileSchema.index({ isVerified: 1 });

module.exports = mongoose.model('TrainingCenterProfile', trainingCenterProfileSchema);
