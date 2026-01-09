const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const requirementsController = require('../controllers/requirementsController');

// Get uploaded file for a user and requirement
router.get('/:requirementId/user-file/:userId', async (req, res) => {
    try {
        const db = require('../db');
        const { requirementId, userId } = req.params;
        // Find the uploaded file for this user and requirement
        const [rows] = await db.query(
            'SELECT file_name, file_path FROM office_proof_documents WHERE requirement_id = ? AND uploaded_by = ? ORDER BY uploaded_at DESC LIMIT 1',
            [requirementId, userId]
        );
        if (!rows || rows.length === 0) {
            return res.status(404).json({ success: false, message: 'No file found for this user and requirement' });
        }
        const file = rows[0];
        // Ensure file path is correct for event folder
        let fileUrl = file.file_path;
        // If file_path starts with /uploads/events/, serve as is
        // If file_path starts with /uploads/documents/, replace with /uploads/events/
        if (fileUrl.startsWith('/uploads/documents/')) {
            // Try to extract event name from file_name (if possible)
            // Otherwise, fallback to searching the events folder
            // For now, replace /documents/ with /events/ for compatibility
            fileUrl = fileUrl.replace('/uploads/documents/', '/uploads/events/');
        }
        res.json({ success: true, file: { fileName: file.file_name, url: `http://localhost:5000${fileUrl}` } });
    } catch (error) {
        console.error('Error fetching user file:', error);
        res.status(500).json({ success: false, message: 'Error fetching user file', error: error.message });
    }
});

// Multer config for user requirement uploads (sync, temp folder)
const tempUserReqUploadDir = path.join(__dirname, '../uploads/tmp-user-uploads');
if (!fs.existsSync(tempUserReqUploadDir)) {
    fs.mkdirSync(tempUserReqUploadDir, { recursive: true });
}
const userReqUpload = multer({
    dest: tempUserReqUploadDir,
    limits: { fileSize: 10 * 1024 * 1024 },
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
        // Get requirement info for event and office
        const db = require('../db');
        const [rows] = await db.query(`
            SELECT r.RequirementID, r.Description, c.EventID, e.EventName, rua.OfficeID, c.CriteriaName
            FROM requirements r
            LEFT JOIN criteria c ON r.CriteriaID = c.CriteriaID
            LEFT JOIN Events e ON c.EventID = e.EventID
            LEFT JOIN requirement_user_assignments rua ON rua.RequirementID = r.RequirementID AND rua.UserID = ?
            WHERE r.RequirementID = ?
            LIMIT 1
        `, [userId, requirementId]);
        if (!rows || rows.length === 0) return res.status(400).json({ success: false, message: 'Requirement not found' });
        const { EventName, OfficeID, Description, CriteriaName } = rows[0];
        // Get office name
        let officeName = 'UnknownOffice';
        if (OfficeID) {
            const [officeRows] = await db.query('SELECT OfficeName FROM offices WHERE OfficeID = ?', [OfficeID]);
            if (officeRows && officeRows.length > 0) {
                officeName = officeRows[0].OfficeName;
            }
        }
        // Get user name
        let userName = 'UnknownUser';
        const [userRows] = await db.query('SELECT FirstName, LastName FROM users WHERE UserID = ?', [userId]);
        if (userRows && userRows.length > 0) {
            userName = `${userRows[0].FirstName}_${userRows[0].LastName}`;
        }
        // Sanitize names for folder and filename
        const safeEventName = EventName.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 40);
        const safeOfficeName = officeName.replace(/[^a-zA-Z0-9-]/g, '.').substring(0, 40);
        const safeCriteriaName = (CriteriaName || '').replace(/[^a-zA-Z0-9-]/g, '.').substring(0, 40);
        const safeReqName = Description.replace(/[^a-zA-Z0-9-]/g, '.').substring(0, 40);
        const safeUserName = userName.replace(/[^a-zA-Z0-9-]/g, '.').substring(0, 40);
        const ext = require('path').extname(req.file.originalname);
        const finalFileName = `${safeOfficeName}.${safeCriteriaName}.${safeReqName}.${safeUserName}${ext}`;
        const eventDir = path.join(__dirname, `../uploads/events/${safeEventName}`);
        if (!fs.existsSync(eventDir)) {
            fs.mkdirSync(eventDir, { recursive: true });
        }
        const destPath = path.join(eventDir, finalFileName);
        // Move file from temp to final location
        fs.renameSync(req.file.path, destPath);
        const filePath = `/uploads/events/${safeEventName}/${finalFileName}`;
        await db.query(
            'INSERT INTO office_proof_documents (office_id, uploaded_by, requirement_id, file_name, file_path, uploaded_at) VALUES (?, ?, ?, ?, ?, NOW())',
            [OfficeID, userId, requirementId, finalFileName, filePath]
        );
        res.json({
            success: true,
            message: 'File uploaded successfully',
            filename: finalFileName,
            originalname: req.file.originalname,
            url: filePath
        });
    } catch (error) {
        console.error('Error uploading user requirement file:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error uploading file', 
            error: error.message, 
            stack: error.stack 
        });
    }
});

// Events routes (legacy - keeping for compatibility)
router.get('/', requirementsController.getAllEvents);
router.post('/add-event', requirementsController.addEvent);
router.post('/delete-events', requirementsController.deleteEvents);
router.put('/update-event/:id', requirementsController.updateEvent);

module.exports = router;
