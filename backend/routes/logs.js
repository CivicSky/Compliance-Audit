const express = require('express');
const router = express.Router();
const logsController = require('../controllers/logsController');

// GET /logs - fetch audit logs
router.get('/', logsController.getLogs);

module.exports = router;
