const express = require('express');
const router = express.Router();
const requirementsController = require('../controllers/requirementsController');

// Criteria routes
router.get('/criteria', requirementsController.getAllCriteria);
router.get('/criteria/event/:eventId', requirementsController.getCriteriaByEvent);

// Requirements routes
router.get('/all', requirementsController.getAllRequirements);
router.get('/event/:eventId', requirementsController.getRequirementsByEvent);
router.post('/add', requirementsController.addRequirement);
router.put('/update/:id', requirementsController.updateRequirement);
router.post('/delete', requirementsController.deleteRequirements);

// Events routes (legacy - keeping for compatibility)
router.get('/', requirementsController.getAllEvents);
router.post('/add-event', requirementsController.addEvent);
router.post('/delete-events', requirementsController.deleteEvents);
router.put('/update-event/:id', requirementsController.updateEvent);

module.exports = router;
