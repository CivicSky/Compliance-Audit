const express = require('express');
const router = express.Router();
const userController = require('../controllers/usersController');

router.use(express.json());

router.get('/', userController.getUsers);

module.exports = router;