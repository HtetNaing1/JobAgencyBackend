const mongoose = require('mongoose');

const bookmarkSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  itemType: {
    type: String,
    enum: ['job', 'course'],
    required: true
  },
  // Store the item ID in a single field regardless of type
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  // Keep references for population
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job'
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TrainingCourse'
  }
}, {
  timestamps: true
});

// Single compound index to prevent duplicate bookmarks
bookmarkSchema.index({ user: 1, itemType: 1, itemId: 1 }, { unique: true });

// Index for efficient queries
bookmarkSchema.index({ user: 1, itemType: 1, createdAt: -1 });
bookmarkSchema.index({ user: 1, createdAt: -1 });

// Pre-save hook to set job/course reference and validate
bookmarkSchema.pre('save', function(next) {
  // Set the appropriate reference field based on itemType
  if (this.itemType === 'job') {
    this.job = this.itemId;
    this.course = undefined;
  } else if (this.itemType === 'course') {
    this.course = this.itemId;
    this.job = undefined;
  }
  next();
});

module.exports = mongoose.model('Bookmark', bookmarkSchema);
