const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const requirementsController = require('../controllers/RequirementsController');
const { auth, restrictAuditor } = require('../middleware/auth');
const { recordLog } = require('../controllers/logsController');

const ensureSortOrderColumn = async (db) => {
    try {
        await db.query('ALTER TABLE office_proof_documents ADD COLUMN sort_order INT DEFAULT 0');
    } catch (e) {
        // Column already exists
    }
};

// Get all uploaded files for a user and requirement
router.get('/:requirementId/user-file/:userId', async (req, res) => {
    try {
        const db = require('../db');
        const { requirementId, userId } = req.params;
        
        let rows = [];
        try {
            const [r] = await db.query(
                'SELECT id, file_name, display_name, comment, file_path, uploaded_at, sort_order FROM office_proof_documents WHERE requirement_id = ? AND uploaded_by = ? ORDER BY sort_order ASC, id ASC',
                [requirementId, userId]
            );
            rows = r;
        } catch (e) {
            await ensureSortOrderColumn(db);
            const [r] = await db.query(
                'SELECT id, file_name, display_name, comment, file_path, uploaded_at FROM office_proof_documents WHERE requirement_id = ? AND uploaded_by = ? ORDER BY id ASC',
                [requirementId, userId]
            );
            rows = r;
        }

        if (!rows || rows.length === 0) {
            return res.status(404).json({ success: false, message: 'No files found for this user and requirement', files: [] });
        }
        
        const files = rows.map(file => {
            let fileUrl = file.file_path || '';
            if (fileUrl.startsWith('/uploads/documents/')) {
                fileUrl = fileUrl.replace('/uploads/documents/', '/uploads/events/');
            }
            return {
                id: file.id,
                fileName: file.file_name,
                displayName: file.display_name || file.file_name,
                comment: file.comment || '',
                url: fileUrl.startsWith('http') ? fileUrl : `http://localhost:5000${fileUrl}`,
                uploadedAt: file.uploaded_at
            };
        });

        res.json({ 
            success: true, 
            files: files,
            file: files.length > 0 ? files[files.length - 1] : null 
        });
    } catch (error) {
        console.error('Error fetching user files:', error);
        res.status(500).json({ success: false, message: 'Error fetching user files', error: error.message });
    }
});

// Reorder evidence files order for a user and requirement
router.patch('/:requirementId/user-file/:userId/reorder', async (req, res) => {
    try {
        const db = require('../db');
        const { requirementId, userId } = req.params;
        const { orderedIds } = req.body;

        if (!Array.isArray(orderedIds)) {
            return res.status(400).json({ success: false, message: 'orderedIds array is required' });
        }

        await ensureSortOrderColumn(db);

        for (let i = 0; i < orderedIds.length; i++) {
            await db.query(
                'UPDATE office_proof_documents SET sort_order = ? WHERE id = ? AND requirement_id = ? AND uploaded_by = ?',
                [i, orderedIds[i], requirementId, userId]
            );
        }

        res.json({ success: true, message: 'Files reordered successfully' });
    } catch (error) {
        console.error('Error reordering user files:', error);
        res.status(500).json({ success: false, message: 'Error reordering files', error: error.message });
    }
});

// Rename custom display title and disk file name for an evidence file
router.patch('/:requirementId/file/:fileId/rename', auth, async (req, res) => {
    try {
        const db = require('../db');
        const { fileId } = req.params;
        const { displayName } = req.body;
        if (!displayName || !displayName.trim()) {
            return res.status(400).json({ success: false, message: 'Display name is required' });
        }

        const trimmedTitle = displayName.trim();

        // 1. Get current document row
        const [rows] = await db.query(
            'SELECT id, file_name, display_name, file_path, uploaded_by FROM office_proof_documents WHERE id = ? LIMIT 1',
            [fileId]
        );

        if (!rows || rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }

        const doc = rows[0];
        const oldFileName = doc.file_name || '';
        const oldFilePath = doc.file_path || '';

        let newFileName = oldFileName;
        let newFilePath = oldFilePath;

        if (oldFileName) {
            const ext = path.extname(oldFileName);
            const nameWithoutExt = path.basename(oldFileName, ext);
            
            // Extract base prefix before any underscore (e.g. PAASCU.AREA.1.Z.A.1.Lenuel.Betita)
            let prefix = nameWithoutExt;
            const underscoreIdx = prefix.indexOf('_');
            if (underscoreIdx !== -1) {
                prefix = prefix.substring(0, underscoreIdx);
            }

            const safeTitle = trimmedTitle.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 50);
            const baseFileName = `${prefix}_${safeTitle}`;
            let candidateFileName = `${baseFileName}${ext}`;

            if (oldFilePath) {
                const dir = path.dirname(oldFilePath);
                const absDir = path.join(__dirname, '..', dir.replace(/^\//, ''));

                let counter = 1;
                while (fs.existsSync(path.join(absDir, candidateFileName)) && candidateFileName !== oldFileName) {
                    counter++;
                    candidateFileName = `${baseFileName}_${counter}${ext}`;
                }

                newFileName = candidateFileName;
                newFilePath = (dir === '/' || dir === '\\' ? '' : dir) + '/' + newFileName;

                const oldAbsPath = path.join(__dirname, '..', oldFilePath.replace(/^\//, ''));
                const newAbsPath = path.join(__dirname, '..', newFilePath.replace(/^\//, ''));

                try {
                    if (fs.existsSync(oldAbsPath) && oldAbsPath !== newAbsPath) {
                        fs.renameSync(oldAbsPath, newAbsPath);
                    }
                } catch (fsErr) {
                    console.warn('Physical file rename warning:', fsErr);
                }
            }
        }

        // Authorization: allow admins, or auditors only for their own uploaded files
        const actorRole = Number(req.user?.roleId || 0);
        const actorId = Number(req.user?.userId || 0);
        if (actorRole === 4 && Number(rows[0].uploaded_by) !== actorId) {
            return res.status(403).json({ success: false, message: 'Forbidden: auditors may only rename their own files' });
        }

        // 2. Update DB
        await db.query(
            'UPDATE office_proof_documents SET display_name = ?, file_name = ?, file_path = ? WHERE id = ?',
            [trimmedTitle, newFileName, newFilePath, fileId]
        );

        let fileUrl = newFilePath;
        if (fileUrl.startsWith('/uploads/documents/')) {
            fileUrl = fileUrl.replace('/uploads/documents/', '/uploads/events/');
        }
        const fullUrl = fileUrl.startsWith('http') ? fileUrl : `http://localhost:5000${fileUrl}`;

        res.json({
            success: true,
            message: 'Document title and clean file name updated successfully',
            file: {
                id: Number(fileId),
                fileName: newFileName,
                displayName: trimmedTitle,
                url: fullUrl
            }
        });
    } catch (error) {
        console.error('Error renaming evidence document:', error);
        res.status(500).json({ success: false, message: 'Error updating document title', error: error.message });
    }
});

// Update comment for an evidence file
router.patch('/:requirementId/file/:fileId/comment', auth, async (req, res) => {
    try {
        const db = require('../db');
        const { fileId } = req.params;
        const { comment } = req.body;
        await db.query(
            'UPDATE office_proof_documents SET comment = ? WHERE id = ?',
            [comment ? comment.trim() : '', fileId]
        );
        res.json({ success: true, message: 'Document comment updated successfully' });
    } catch (error) {
        console.error('Error updating evidence document comment:', error);
        res.status(500).json({ success: false, message: 'Error updating document comment', error: error.message });
    }
});

// Delete uploaded file for a user and requirement (unsubmit specific file or latest)
router.delete('/:requirementId/file/:userId', auth, async (req, res) => {
    try {
        const db = require('../db');
        const { requirementId, userId } = req.params;
        const targetFileId = req.query.fileId ? Number(req.query.fileId) : null;

        // Authorization: auditors may only delete their own files
        const actorRole = Number(req.user?.roleId || 0);
        const actorId = Number(req.user?.userId || 0);
        if (actorRole === 4 && actorId !== Number(userId)) {
            return res.status(403).json({ success: false, message: 'Forbidden: auditors may only delete their own files' });
        }

        let rows = [];
        if (targetFileId) {
            [rows] = await db.query(
                'SELECT id, office_id, file_name, display_name, file_path FROM office_proof_documents WHERE id = ? AND requirement_id = ? AND uploaded_by = ? LIMIT 1',
                [targetFileId, requirementId, userId]
            );
        } else {
            [rows] = await db.query(
                'SELECT id, office_id, file_name, display_name, file_path FROM office_proof_documents WHERE requirement_id = ? AND uploaded_by = ? ORDER BY uploaded_at DESC LIMIT 1',
                [requirementId, userId]
            );
        }

        if (!rows || rows.length === 0) {
            return res.status(404).json({ success: false, message: 'No uploaded file found for this user and requirement' });
        }

        const file = rows[0];
        const filePath = file.file_path || file.filePath || file.file_name;
        const absPath = path.join(__dirname, '..', filePath.replace(/^\//, ''));

        // Delete from DB
        await db.query(
            'DELETE FROM office_proof_documents WHERE id = ?',
            [file.id]
        );

        // Check if other DB records use the same physical file on disk
        const [sharedRows] = await db.query(
            'SELECT id FROM office_proof_documents WHERE file_path = ? LIMIT 1',
            [file.file_path]
        );
        if (!sharedRows || sharedRows.length === 0) {
            try {
                if (fs.existsSync(absPath)) {
                    fs.unlinkSync(absPath);
                }
            } catch (fsErr) {
                console.warn('Failed to delete file from disk:', fsErr);
            }
        }

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

        // Check remaining uploaded files count for this user & requirement
        const [remaining] = await db.query(
            'SELECT COUNT(*) as cnt FROM office_proof_documents WHERE requirement_id = ? AND uploaded_by = ?',
            [requirementId, userId]
        );

        const remainingCount = remaining[0]?.cnt || 0;
        if (remainingCount === 0) {
            try {
                await db.query(
                    'UPDATE requirement_user_assignments SET HasUploaded = 0 WHERE RequirementID = ? AND UserID = ?',
                    [requirementId, userId]
                );
            } catch (uErr) {
                console.warn('Failed to update requirement_user_assignments HasUploaded flag:', uErr);
            }
        }

        res.json({ success: true, message: 'Uploaded file deleted successfully', remainingCount });
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
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|mp4|webm|ogg|mov|avi|mkv/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        if (extname) {
            return cb(null, true);
        }
        cb(new Error('Only images, videos, PDFs, and Office documents are allowed'));
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
        const { requirementId, userId, displayName, comment, officeId } = req.body;
        if (!requirementId || !userId) {
            return res.status(400).json({ success: false, message: 'RequirementID and UserID are required' });
        }
        // Get requirement info for event and office
        const db = require('../db');
        const [rows] = await db.query(`
            SELECT r.RequirementID, r.RequirementCode, r.Description, c.EventID, e.EventName, e.EventCode, rua.OfficeID, c.CriteriaName, c.CriteriaCode, a.AreaID, a.AreaCode, a.AreaName
            FROM requirements r
            LEFT JOIN criteria c ON r.CriteriaID = c.CriteriaID
            LEFT JOIN Events e ON c.EventID = e.EventID
            LEFT JOIN areas a ON c.AreaID = a.AreaID
            LEFT JOIN requirement_user_assignments rua ON rua.RequirementID = r.RequirementID AND rua.UserID = ?
            WHERE r.RequirementID = ?
            LIMIT 1
        `, [userId, requirementId]);
        if (!rows || rows.length === 0) return res.status(400).json({ success: false, message: 'Requirement not found' });
        const { EventName, OfficeID, Description, CriteriaName, RequirementCode } = rows[0];
        
        const resolvedOfficeId = officeId ? Number(officeId) : OfficeID;
        
        let officeName = 'UnknownOffice';
        if (resolvedOfficeId) {
            const [officeRows] = await db.query('SELECT OfficeName FROM offices WHERE OfficeID = ?', [resolvedOfficeId]);
            if (officeRows && officeRows.length > 0) {
                officeName = officeRows[0].OfficeName;
            }
        }
        
        let userName = 'UnknownUser';
        const [userRows] = await db.query('SELECT FirstName, LastName FROM users WHERE UserID = ?', [userId]);
        if (userRows && userRows.length > 0) {
            userName = `${userRows[0].FirstName}_${userRows[0].LastName}`;
        }

        const safeEventName = (rows[0].EventCode || EventName).replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 40);
        const safeArea = ((rows[0].AreaCode || rows[0].AreaName) || 'NoArea').replace(/[^a-zA-Z0-9-]/g, '.').substring(0, 40);
        const safeCriteriaCode = (rows[0].CriteriaCode || CriteriaName || '').replace(/[^a-zA-Z0-9-]/g, '.').substring(0, 40);
        const safeReqCode = (RequirementCode || '').replace(/[^a-zA-Z0-9-]/g, '.').substring(0, 40);
        const safeUserName = userName.replace(/[^a-zA-Z0-9-]/g, '.').substring(0, 40);
        const ext = require('path').extname(req.file.originalname);

        const fileTitle = (displayName && displayName.trim()) 
            ? displayName.trim() 
            : require('path').basename(req.file.originalname, ext);

        const safeTitle = fileTitle.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 50);

        // Clean filename pattern without random numbers or timestamps
        const eventDir = require('path').join(__dirname, `../uploads/events/${safeEventName}`);
        if (!fs.existsSync(eventDir)) {
            fs.mkdirSync(eventDir, { recursive: true });
        }

        const baseFileName = `${safeEventName}.${safeArea}.${safeCriteriaCode}.${safeReqCode}.${safeUserName}_${safeTitle}`;
        let finalFileName = `${baseFileName}${ext}`;

        let collisionCounter = 1;
        while (fs.existsSync(require('path').join(eventDir, finalFileName))) {
            collisionCounter++;
            finalFileName = `${baseFileName}_${collisionCounter}${ext}`;
        }

        const destPath = require('path').join(eventDir, finalFileName);
        fs.renameSync(req.file.path, destPath);
        const filePath = `/uploads/events/${safeEventName}/${finalFileName}`;

        const fileComment = comment ? comment.trim() : '';

        const [insertResult] = await db.query(
            'INSERT INTO office_proof_documents (office_id, uploaded_by, requirement_id, file_name, display_name, comment, file_path, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
            [resolvedOfficeId, userId, requirementId, finalFileName, fileTitle, fileComment, filePath]
        );

        // Update HasUploaded flag to 1
        await db.query(
            'UPDATE requirement_user_assignments SET HasUploaded = 1 WHERE RequirementID = ? AND UserID = ?',
            [requirementId, userId]
        );

        try {
            const { createNotifications, getAdminUserIds } = require('../utils/notificationService');
            const actorUserId = Number(req.user?.userId || userId);
            const adminIds = await getAdminUserIds();
            const uploaderDisplay = userName.replace(/_/g, ' ');
            if (adminIds.length > 0 && resolvedOfficeId) {
                await createNotifications({
                    userIds: adminIds.filter((id) => id !== actorUserId),
                    adminId: actorUserId,
                    title: 'New evidence uploaded',
                    message: `${uploaderDisplay} uploaded evidence for ${RequirementCode || 'a requirement'} in ${officeName}.`,
                    type: 'info',
                    relatedTable: 'requirement_file_upload',
                    relatedId: Number(resolvedOfficeId),
                    meta: {
                        officeId: Number(resolvedOfficeId),
                        requirementId: Number(requirementId),
                        viewUserId: Number(userId),
                        openSubmission: true,
                    },
                });
            }
        } catch (notifErr) {
            console.error('Failed to notify admins about file upload:', notifErr);
        }

        try {
            const actorUserId = Number(req.user?.userId || userId);
            if (Number.isInteger(actorUserId) && actorUserId > 0) {
                await recordLog(actorUserId, 'RequirementFileUploaded', {
                    RequirementID: Number(requirementId),
                    RequirementCode: RequirementCode || null,
                    RequirementDescription: Description || null,
                    OfficeID: resolvedOfficeId ? Number(resolvedOfficeId) : null,
                    OfficeName: officeName || null,
                    EventName: EventName || null,
                    CriteriaName: CriteriaName || null,
                    FileName: finalFileName,
                    DisplayName: fileTitle,
                    Comment: fileComment,
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
            file: {
                id: insertResult.insertId,
                fileName: finalFileName,
                displayName: fileTitle,
                comment: fileComment,
                originalname: req.file.originalname,
                url: filePath,
                uploadedAt: new Date()
            }
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
