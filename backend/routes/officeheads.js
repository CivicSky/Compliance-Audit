const express = require('express');
const router = express.Router();
const officeHeadsController = require('../controllers/officeheadsController');

// Debug: log available controller functions
console.log('officeHeadsController functions:', Object.keys(officeHeadsController));

router.use(express.json());

// Office heads routes - add-multiple BEFORE the :id route to avoid conflicts
router.post('/add-multiple', officeHeadsController.addMultipleHeads);
router.post('/add', officeHeadsController.uploadProfilePic, officeHeadsController.addHead);
router.get('/all', officeHeadsController.getAllHeads);
router.get('/:id', officeHeadsController.getHeadById);
router.delete('/delete', officeHeadsController.deleteHeads);
// Alternative route for delete with query parameters
router.delete('/delete-by-ids', officeHeadsController.deleteHeads);

module.exports = router;
