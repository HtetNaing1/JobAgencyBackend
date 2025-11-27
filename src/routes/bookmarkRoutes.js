const express = require('express');
const router = express.Router();
const {
  addBookmark,
  removeBookmark,
  getMyBookmarks,
  checkBookmark,
  toggleBookmark,
  getBookmarkIds
} = require('../controllers/bookmarkController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication and jobseeker role
router.use(protect);
router.use(authorize('jobseeker'));

// Get all bookmarks for current user
router.get('/', getMyBookmarks);

// Get bookmark IDs for quick checking
router.get('/ids', getBookmarkIds);

// Check if an item is bookmarked
router.get('/check/:itemType/:itemId', checkBookmark);

// Add a bookmark
router.post('/', addBookmark);

// Toggle bookmark
router.post('/toggle', toggleBookmark);

// Remove a bookmark
router.delete('/:itemType/:itemId', removeBookmark);

module.exports = router;
