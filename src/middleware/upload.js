const multer = require('multer');
const path = require('path');

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter for different upload types
const fileFilter = (allowedTypes) => (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`), false);
  }
};

// Resume upload configuration (PDF only, max 5MB)
const uploadResume = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: fileFilter(['.pdf']),
});

// Image upload configuration (JPG, PNG, max 10MB)
const uploadImage = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: fileFilter(['.jpg', '.jpeg', '.png', '.webp']),
});

// Logo upload configuration (JPG, PNG, max 5MB)
const uploadLogo = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: fileFilter(['.jpg', '.jpeg', '.png', '.webp', '.svg']),
});

module.exports = {
  uploadResume,
  uploadImage,
  uploadLogo,
};
