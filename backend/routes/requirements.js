const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const requirementsController = require('../controllers/RequirementsController');
const auth = require('../middleware/auth');
const { recordLog } = require('../controllers/logsController');

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

    // Delete uploaded file for a user and requirement (unsubmit)
    router.delete('/:requirementId/file/:userId', auth, async (req, res) => {
        try {
            const db = require('../db');
            const { requirementId, userId } = req.params;

            // Find the latest uploaded file record for this user and requirement
            const [rows] = await db.query(
                'SELECT office_id, file_name, file_path FROM office_proof_documents WHERE requirement_id = ? AND uploaded_by = ? ORDER BY uploaded_at DESC LIMIT 1',
                [requirementId, userId]
            );

            if (!rows || rows.length === 0) {
                return res.status(404).json({ success: false, message: 'No uploaded file found for this user and requirement' });
            }

            const file = rows[0];
            const filePath = file.file_path || file.filePath || file.file_name;
            // Resolve absolute path on disk
            const fs = require('fs');
            const path = require('path');
            const absPath = path.join(__dirname, '..', filePath.replace(/^\//, ''));

            // Attempt to delete file from filesystem if it exists
            try {
                if (fs.existsSync(absPath)) {
                    fs.unlinkSync(absPath);
                }
            } catch (fsErr) {
                console.warn('Failed to delete file from disk:', fsErr);
                // proceed to delete DB record even if file removal failed
            }

            // Delete the DB record (limit to the latest matching record)
            await db.query(
                'DELETE FROM office_proof_documents WHERE requirement_id = ? AND uploaded_by = ? LIMIT 1',
                [requirementId, userId]
            );

            try {
                const [[contextRow]] = await db.query(
                    `SELECT
                        r.RequirementCode,
                        r.Description AS RequirementDescription,
                        o.OfficeName,
                        e.EventName
                     FROM requirements r
                     LEFT JOIN criteria c ON c.CriteriaID = r.CriteriaID
                     LEFT JOIN events e ON e.EventID = c.EventID
                     LEFT JOIN offices o ON o.OfficeID = ?
                     WHERE r.RequirementID = ?
                     LIMIT 1`,
                    [rows[0]?.office_id || null, requirementId]
                );

                const actorUserId = Number(req.user?.userId || userId);
                if (Number.isInteger(actorUserId) && actorUserId > 0) {
                    await recordLog(actorUserId, 'RequirementFileUnsubmitted', {
                        RequirementID: Number(requirementId),
                        RequirementCode: contextRow?.RequirementCode || null,
                        RequirementDescription: contextRow?.RequirementDescription || null,
                        OfficeName: contextRow?.OfficeName || null,
                        EventName: contextRow?.EventName || null,
                        FileName: rows[0]?.file_name || null,
                        UploadedByUserID: Number(userId),
                    });
                }
            } catch (logErr) {
                console.error('Failed to record unsubmit upload log:', logErr);
            }

            // Also reset HasUploaded flag on the user assignment so UI reflects that user can upload again
            try {
                await db.query(
                    'UPDATE requirement_user_assignments SET HasUploaded = 0 WHERE RequirementID = ? AND UserID = ?',
                    [requirementId, userId]
                );
            } catch (uErr) {
                console.warn('Failed to update requirement_user_assignments HasUploaded flag:', uErr);
            }

            res.json({ success: true, message: 'Uploaded file deleted successfully' });
        } catch (error) {
            console.error('Error deleting user uploaded file:', error);
            res.status(500).json({ success: false, message: 'Error deleting uploaded file', error: error.message });
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

// Requirements routes
router.get('/all', requirementsController.getAllRequirements);
router.get('/event/:eventId', requirementsController.getRequirementsByEvent);
router.get('/criteria/:criteriaId', requirementsController.getRequirementsByCriteria);
router.post('/add', auth, requirementsController.addRequirement);
router.put('/update/:id', auth, requirementsController.updateRequirement);
router.post('/delete', auth, requirementsController.deleteRequirements);

// User assignment routes
router.post('/assign-users', auth, requirementsController.assignUsersToRequirement);
router.get('/assigned-users/:requirementId', requirementsController.getAssignedUsers);
router.get('/my-assignments', auth, requirementsController.getMyAssignments);
router.delete('/assignment/:assignmentId', auth, requirementsController.removeUserAssignment);
router.get('/user-assignment-count/:userId', requirementsController.getUserAssignmentCount);
router.get('/available-users', requirementsController.getAvailableUsersForAssignment);
router.put('/assignment/:assignmentId/upload-status', auth, requirementsController.updateUserUploadStatus);
router.post('/mark-uploaded', auth, requirementsController.markUserAsUploaded);

// User requirement file upload route
router.post('/user-upload', auth, userReqUpload.single('file'), async (req, res) => {
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
            SELECT r.RequirementID, r.RequirementCode, r.Description, c.EventID, e.EventName, rua.OfficeID, c.CriteriaName
            FROM requirements r
            LEFT JOIN criteria c ON r.CriteriaID = c.CriteriaID
            LEFT JOIN Events e ON c.EventID = e.EventID
            LEFT JOIN requirement_user_assignments rua ON rua.RequirementID = r.RequirementID AND rua.UserID = ?
            WHERE r.RequirementID = ?
            LIMIT 1
        `, [userId, requirementId]);
        if (!rows || rows.length === 0) return res.status(400).json({ success: false, message: 'Requirement not found' });
        const { EventName, OfficeID, Description, CriteriaName, RequirementCode } = rows[0];
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

        try {
            const actorUserId = Number(req.user?.userId || userId);
            if (Number.isInteger(actorUserId) && actorUserId > 0) {
                await recordLog(actorUserId, 'RequirementFileUploaded', {
                    RequirementID: Number(requirementId),
                    RequirementCode: RequirementCode || null,
                    RequirementDescription: Description || null,
                    OfficeID: OfficeID ? Number(OfficeID) : null,
                    OfficeName: officeName || null,
                    EventName: EventName || null,
                    CriteriaName: CriteriaName || null,
                    FileName: finalFileName,
                    UploadedByUserID: Number(userId),
                    UploadedByName: userName.replace(/_/g, ' '),
                });
            }
        } catch (logErr) {
            console.error('Failed to record upload log:', logErr);
        }

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
