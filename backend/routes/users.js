const express = require('express');
const router = express.Router();
const userController = require('../controllers/usersController');

router.use(express.json());

// User authentication routes
router.post('/register', userController.registerUser);
router.post('/login', userController.loginUser);

// User data routes
router.get('/', userController.getUsers);

module.exports = router;