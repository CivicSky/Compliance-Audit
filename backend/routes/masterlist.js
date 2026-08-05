const express = require('express');
const router = express.Router();
const rateLimit = require('../middleware/rateLimit');
const masterlistController = require('../controllers/masterlistController');
const auth = require('../middleware/auth');

router.get('/', rateLimit({ windowMs: 60 * 1000, max: 30 }), masterlistController.getAll);
router.post('/add', auth, masterlistController.addItem);
router.put('/:id', auth, masterlistController.updateItem);
router.delete('/:id', auth, masterlistController.deleteItem);

module.exports = router;
