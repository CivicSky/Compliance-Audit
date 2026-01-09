const express = require('express');
const router = express.Router();
const eventsController = require('../controllers/EventsController');

// Get all events
router.get('/', eventsController.getAllEvents);

// Add new event
router.post('/add', eventsController.addEvent);

// Delete multiple events
router.post('/delete', eventsController.deleteEvents);

// Update event
router.put('/update/:id', eventsController.updateEvent);

// Get downloadable folders
router.get('/downloadable-folders', eventsController.getDownloadableFolders);

// Download event folder as zip
router.get('/download/:eventName', eventsController.downloadEventZip);

module.exports = router;
