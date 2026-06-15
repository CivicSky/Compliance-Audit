const express = require('express');
const router = express.Router();
const officeHeadsController = require('../controllers/officeheadsController');
const optionalAuth = require('../middleware/optionalAuth');
const rateLimit = require('../middleware/rateLimit');

// Debug: log available controller functions
console.log('officeHeadsController functions:', Object.keys(officeHeadsController));

router.use(express.json());

// Office heads routes - add-multiple BEFORE the :id route to avoid conflicts
router.post('/add-multiple', optionalAuth, officeHeadsController.addMultipleHeads);
router.post('/add', optionalAuth, officeHeadsController.uploadProfilePic, officeHeadsController.addHead);
router.put('/:id', optionalAuth, officeHeadsController.uploadProfilePic, officeHeadsController.updateHead);
// Apply rate limit to list endpoint to protect from excessive paging requests
router.get('/all', rateLimit({ windowMs: 60 * 1000, max: 30 }), officeHeadsController.getAllHeads);
router.get('/:id', officeHeadsController.getHeadById);
router.delete('/delete', optionalAuth, officeHeadsController.deleteHeads);
// Alternative route for delete with query parameters
router.delete('/delete-by-ids', optionalAuth, officeHeadsController.deleteHeads);

module.exports = router;
