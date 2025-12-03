const express = require('express');
const router = express.Router();
const userListController = require('../controllers/userlistcontroller');

// GET all users
router.get('/', userListController.getAllUsers);

module.exports = router;
