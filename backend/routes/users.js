const express = require('express');
const router = express.Router();
const userController = require('../controllers/usersController');
const auth = require("../middleware/auth");
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // you can customize destination

// upload profile
router.put('/:id', auth, upload.single('profilePic'), userController.updateUser);

router.get("/me", auth, userController.getLoggedInUser);
router.use(express.json());

// User authentication routes
router.post('/register', userController.registerUser);
router.post('/login', userController.loginUser);

// User data routes
router.get('/', userController.getUsers);
router.get('/current/:email', userController.getCurrentUser);

// Edit User
router.put('/:id', auth, userController.updateUser);


module.exports = router;