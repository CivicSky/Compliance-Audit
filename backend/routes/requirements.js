const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const requirementsController = require('../controllers/requirementsController');

// Configure multer for user requirement uploads
const userReqUploadDir = path.join(__dirname, '../uploads/user-requirements');
if (!fs.existsSync(userReqUploadDir)) {
    fs.mkdirSync(userReqUploadDir, { recursive: true });
}

const userReqStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, userReqUploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `req-${req.body.requirementId}-user-${req.body.userId}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const userReqUpload = multer({ 
    storage: userReqStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        if (extname) {
            return cb(null, true);
        }
        cb(new Error('Only images, PDFs, and Office documents are allowed'));
    }
});

// Criteria routes
router.get('/criteria', requirementsController.getAllCriteria);
router.get('/criteria/event/:eventId', requirementsController.getCriteriaByEvent);

// Requirements routes
router.get('/all', requirementsController.getAllRequirements);
router.get('/event/:eventId', requirementsController.getRequirementsByEvent);
router.post('/add', requirementsController.addRequirement);
router.put('/update/:id', requirementsController.updateRequirement);
router.post('/delete', requirementsController.deleteRequirements);

// User assignment routes
router.post('/assign-users', requirementsController.assignUsersToRequirement);
router.get('/assigned-users/:requirementId', requirementsController.getAssignedUsers);
router.delete('/assignment/:assignmentId', requirementsController.removeUserAssignment);
router.get('/user-assignment-count/:userId', requirementsController.getUserAssignmentCount);
router.get('/available-users', requirementsController.getAvailableUsersForAssignment);
router.put('/assignment/:assignmentId/upload-status', requirementsController.updateUserUploadStatus);
router.post('/mark-uploaded', requirementsController.markUserAsUploaded);

// User requirement file upload route
router.post('/user-upload', userReqUpload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }
        
        const { requirementId, userId } = req.body;
        
        if (!requirementId || !userId) {
            return res.status(400).json({ success: false, message: 'RequirementID and UserID are required' });
        }
        
        // File uploaded successfully, return file info
        res.json({
            success: true,
            message: 'File uploaded successfully',
            filename: req.file.filename,
            originalname: req.file.originalname,
            url: `/uploads/user-requirements/${req.file.filename}`
        });
    } catch (error) {
        console.error('Error uploading user requirement file:', error);
        res.status(500).json({ success: false, message: 'Error uploading file' });
    }
});

// Events routes (legacy - keeping for compatibility)
router.get('/', requirementsController.getAllEvents);
router.post('/add-event', requirementsController.addEvent);
router.post('/delete-events', requirementsController.deleteEvents);
router.put('/update-event/:id', requirementsController.updateEvent);

module.exports = router;
