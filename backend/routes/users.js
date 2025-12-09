const express = require('express');
const router = express.Router();
const userController = require('../controllers/usersController');
const auth = require("../middleware/auth");
const multer = require('multer');
const path = require('path');
const multerStorage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, 'uploads/profile-pics/'); // match office head
	},
	filename: function (req, file, cb) {
		const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
		cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
	}
});
const upload = multer({ storage: multerStorage });

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


// Serve profile-pics statically (for user and office head images)
const expressApp = require('express');
router.use('/uploads/profile-pics', expressApp.static('uploads/profile-pics'));

module.exports = router;