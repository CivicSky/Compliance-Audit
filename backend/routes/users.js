const express = require('express');
const router = express.Router();
const userController = require('../controllers/usersController');
const auth = require("../middleware/auth");
const rateLimit = require('../middleware/rateLimit');
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

// Update approval status
router.put('/:id/approval-status', auth, userController.updateApprovalStatus);

// Update user role
router.put('/:id/role', auth, userController.updateUserRole);

router.get("/me", auth, userController.getLoggedInUser);
router.use(express.json());

// User authentication routes
router.post('/registration-invite', auth, userController.createRegistrationInvite);
router.get('/registration-invite/:token', userController.validateRegistrationInvite);
router.post('/send-registration-otp', userController.sendRegistrationOtp);
router.post('/verify-registration-otp', userController.verifyRegistrationOtp);
router.post('/register', userController.registerUser);
router.get('/login-status', userController.loginStatus);
router.post('/login', userController.loginUser);
router.post('/logout', auth, userController.logoutUser);

// User data routes
// Apply rate limiter to list endpoint (pagination/touch endpoints)
router.get('/', rateLimit({ windowMs: 60 * 1000, max: 30 }), userController.getUsers);
router.get('/current/:email', userController.getCurrentUser);

// Bulk delete users (admin only)
router.delete('/', auth, userController.deleteUsers);

// Edit User
router.put('/:id', auth, userController.updateUser);


// Serve profile-pics statically (for user and office head images)
const expressApp = require('express');
router.use('/uploads/profile-pics', expressApp.static('uploads/profile-pics'));

module.exports = router;
