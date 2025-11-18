const express = require('express');
const router = express.Router();
const eventsController = require('../controllers/eventsController');

// Get all events
router.get('/', eventsController.getAllEvents);

// Add new event
router.post('/add', eventsController.addEvent);

// Delete multiple events
router.post('/delete', eventsController.deleteEvents);

// Update event
router.put('/update/:id', eventsController.updateEvent);

module.exports = router;
