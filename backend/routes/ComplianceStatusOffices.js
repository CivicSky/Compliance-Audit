const express = require('express');
const router = express.Router();
const controller = require('../controllers/ComplianceStatusOfficesController');

// GET all compliance status offices
router.get('/', controller.getAllComplianceStatusOffices);

module.exports = router;
