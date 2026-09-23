const express = require('express');
const router = express.Router();
const eventsController = require('../controllers/EventsController');
const { auth, restrictAuditor, restrictAuditorDownloads } = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');

// Get all events
router.get('/', auth, eventsController.getAllEvents);

// Get accreditation levels
router.get('/accreditation-levels', auth, eventsController.getAccreditationLevels);

// Add new event
router.post('/add', auth, restrictAuditor, eventsController.addEvent);

// Delete multiple events
router.post('/delete', auth, restrictAuditor, eventsController.deleteEvents);

// Update event
router.put('/update/:id', auth, restrictAuditor, eventsController.updateEvent);

// Get downloadable folders
router.get('/downloadable-folders', auth, restrictAuditorDownloads, eventsController.getDownloadableFolders);

// Download event folder as zip (blocked for Auditors)
router.get('/download/:eventName', auth, restrictAuditorDownloads, eventsController.downloadEventZip);

// Copy event
router.post('/copy', auth, restrictAuditor, eventsController.copyEvent);

module.exports = router;
