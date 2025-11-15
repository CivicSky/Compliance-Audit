const express = require('express');
const router = express.Router();
const officeHeadsController = require('../controllers/officeheadsController');

router.use(express.json());

// Office heads routes
router.post('/add', officeHeadsController.uploadProfilePic, officeHeadsController.addHead);
router.get('/all', officeHeadsController.getAllHeads);
router.get('/:id', officeHeadsController.getHeadById);
router.delete('/delete', officeHeadsController.deleteHeads);
// Alternative route for delete with query parameters
router.delete('/delete-by-ids', officeHeadsController.deleteHeads);

module.exports = router;
