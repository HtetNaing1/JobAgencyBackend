const mongoose = require('mongoose');

const employerProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    industry: {
      type: String,
      required: [true, 'Industry is required'],
    },
    companySize: {
      type: String,
      enum: ['1-10', '11-50', '51-200', '201-500', '500+'],
      required: [true, 'Company size is required'],
    },
    foundedYear: {
      type: Number,
    },
    location: {
      address: String,
      city: String,
      state: String,
      country: String,
      zipCode: String,
    },
    website: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      maxlength: 2000,
    },
    logo: {
      type: String,
    },
    logoPublicId: {
      type: String,
    },
    coverImage: {
      type: String,
    },
    coverImagePublicId: {
      type: String,
    },
    contactPerson: {
      name: String,
      position: String,
      email: String,
      phone: String,
    },
    socialLinks: {
      linkedIn: String,
      twitter: String,
      facebook: String,
    },
    benefits: [{
      type: String,
    }],
    culture: {
      type: String,
      maxlength: 1000,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isProfileComplete: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Calculate profile completion
employerProfileSchema.methods.calculateCompletion = function() {
  let completed = 0;
  const total = 7;

  if (this.companyName) completed++;
  if (this.industry) completed++;
  if (this.companySize) completed++;
  if (this.location?.city) completed++;
  if (this.description) completed++;
  if (this.contactPerson?.name) completed++;
  if (this.logo) completed++;

  return Math.round((completed / total) * 100);
};

// Update isProfileComplete before saving
employerProfileSchema.pre('save', function(next) {
  const completion = this.calculateCompletion();
  this.isProfileComplete = completion >= 70;
  next();
});

module.exports = mongoose.model('EmployerProfile', employerProfileSchema);
