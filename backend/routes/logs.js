const express = require('express');
const router = express.Router();
const logsController = require('../controllers/logsController');
const rateLimit = require('../middleware/rateLimit');

// GET /logs - fetch audit logs (rate limited to protect heavy queries)
router.get('/', rateLimit({ windowMs: 60 * 1000, max: 30 }), logsController.getLogs);

module.exports = router;
