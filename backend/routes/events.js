const express = require('express');
const router = express.Router();
const eventsController = require('../controllers/EventsController');
const auth = require('../middleware/auth');

// Get all events
router.get('/', eventsController.getAllEvents);

// Add new event
router.post('/add', auth, eventsController.addEvent);

// Delete multiple events
router.post('/delete', auth, eventsController.deleteEvents);

// Update event
router.put('/update/:id', auth, eventsController.updateEvent);

// Update only event status
// router.put('/update-status/:id', eventsController.updateEventStatus);

// Get downloadable folders
router.get('/downloadable-folders', eventsController.getDownloadableFolders);

// Download event folder as zip
router.get('/download/:eventName', eventsController.downloadEventZip);

// Copy event
router.post('/copy', auth, eventsController.copyEvent);

module.exports = router;
