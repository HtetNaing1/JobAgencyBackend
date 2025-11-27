const mongoose = require('mongoose');

const courseInquirySchema = new mongoose.Schema({
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TrainingCourse',
    required: true
  },
  trainingCenter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  inquirer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  inquirerRole: {
    type: String,
    enum: ['jobseeker', 'employer']
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  message: {
    type: String,
    required: [true, 'Inquiry message is required'],
    trim: true
  },
  companyName: {
    type: String // For employers
  },
  numberOfParticipants: {
    type: Number // For employers looking to enroll multiple employees
  },
  status: {
    type: String,
    enum: ['pending', 'contacted', 'enrolled', 'closed'],
    default: 'pending'
  },
  notes: {
    type: String,
    trim: true
  },
  response: {
    message: String,
    respondedAt: Date
  }
}, {
  timestamps: true
});

// Indexes
courseInquirySchema.index({ trainingCenter: 1, status: 1 });
courseInquirySchema.index({ course: 1 });
courseInquirySchema.index({ inquirer: 1 });

module.exports = mongoose.model('CourseInquiry', courseInquirySchema);
