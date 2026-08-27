const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const requirementsController = require('../controllers/RequirementsController');
const { auth, restrictAuditor } = require('../middleware/auth');
const { recordLog } = require('../controllers/logsController');
const { notifyUsers } = require('../utils/notify');

const ensureReviewColumns = async (db) => {
    try {
        await db.query('ALTER TABLE office_proof_documents ADD COLUMN IF NOT EXISTS review_status VARCHAR(20) DEFAULT \'pending\'');
        await db.query('ALTER TABLE office_proof_documents ADD COLUMN IF NOT EXISTS rejection_reason TEXT DEFAULT NULL');
        await db.query('ALTER TABLE office_proof_documents ADD COLUMN IF NOT EXISTS reviewed_by INT DEFAULT NULL');
        await db.query('ALTER TABLE office_proof_documents ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP DEFAULT NULL');
        await db.query('ALTER TABLE office_proof_documents ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0');
    } catch (e) {
        // Ignored if already exist
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
                `SELECT opd.id, opd.file_name, opd.display_name, opd.comment, opd.file_path, opd.uploaded_at, opd.sort_order,
                        opd.review_status, opd.rejection_reason, opd.reviewed_by, opd.reviewed_at,
                        u.FirstName as reviewer_first_name, u.LastName as reviewer_last_name
                 FROM office_proof_documents opd
                 LEFT JOIN users u ON opd.reviewed_by = u.UserID
                 WHERE opd.requirement_id = ? AND opd.uploaded_by = ? 
                 ORDER BY opd.sort_order ASC, opd.id ASC`,
                [requirementId, userId]
            );
            rows = r;
        } catch (e) {
            await ensureReviewColumns(db);
            const [r] = await db.query(
                `SELECT opd.id, opd.file_name, opd.display_name, opd.comment, opd.file_path, opd.uploaded_at, opd.sort_order,
                        opd.review_status, opd.rejection_reason, opd.reviewed_by, opd.reviewed_at,
                        u.FirstName as reviewer_first_name, u.LastName as reviewer_last_name
                 FROM office_proof_documents opd
                 LEFT JOIN users u ON opd.reviewed_by = u.UserID
                 WHERE opd.requirement_id = ? AND opd.uploaded_by = ? 
                 ORDER BY opd.id ASC`,
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
            const revFirstName = file.reviewer_first_name || '';
            const revLastName = file.reviewer_last_name || '';
            const reviewerName = (revFirstName || revLastName) ? `${revFirstName} ${revLastName}`.trim() : null;

            return {
                id: file.id,
                fileName: file.file_name,
                displayName: file.display_name || file.file_name,
                comment: file.comment || '',
                url: fileUrl.startsWith('http') ? fileUrl : `http://localhost:5000${fileUrl}`,
                uploadedAt: file.uploaded_at,
                sortOrder: file.sort_order ?? 0,
                reviewStatus: file.review_status || 'pending',
                rejectionReason: file.rejection_reason || '',
                reviewedBy: file.reviewed_by || null,
                reviewedAt: file.reviewed_at || null,
                reviewerName: reviewerName
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

        await ensureReviewColumns(db);

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
                newFilePath = `${dir}/${candidateFileName}`.replace(/\\/g, '/');

                const oldAbsPath = path.join(__dirname, '..', oldFilePath.replace(/^\//, ''));
                const newAbsPath = path.join(absDir, candidateFileName);

                try {
                    if (fs.existsSync(oldAbsPath)) {
                        fs.renameSync(oldAbsPath, newAbsPath);
                    }
                } catch (fsErr) {
                    console.warn('Failed to rename physical file on disk:', fsErr.message);
                }
            } else {
                newFileName = candidateFileName;
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

        let returnUrl = newFilePath;
        if (returnUrl.startsWith('/uploads/documents/')) {
            returnUrl = returnUrl.replace('/uploads/documents/', '/uploads/events/');
        }
        if (returnUrl && !returnUrl.startsWith('http')) {
            returnUrl = `http://localhost:5000${returnUrl}`;
        }

        res.json({
            success: true,
            message: 'Document renamed successfully',
            displayName: trimmedTitle,
            fileName: newFileName,
            url: returnUrl
        });
    } catch (error) {
        console.error('Error renaming evidence document:', error);
        res.status(500).json({ success: false, message: 'Error renaming document', error: error.message });
    }
});

// Update comment for an evidence file
router.patch('/:requirementId/file/:fileId/comment', auth, async (req, res) => {
    try {
        const db = require('../db');
        const { fileId } = req.params;
        const { comment } = req.body;
        const trimmedComment = comment ? comment.trim() : '';
        
        await ensureReviewColumns(db);

        // Fetch file uploader and metadata
        const [fileRows] = await db.query(
            `SELECT opd.uploaded_by, opd.display_name, opd.office_id, opd.requirement_id, opd.review_status, r.RequirementCode, o.OfficeName
             FROM office_proof_documents opd
             LEFT JOIN requirements r ON opd.requirement_id = r.RequirementID
             LEFT JOIN offices o ON opd.office_id = o.OfficeID
             WHERE opd.id = ? LIMIT 1`,
            [fileId]
        );

        await db.query(
            'UPDATE office_proof_documents SET comment = ?, rejection_reason = CASE WHEN review_status = \'rejected\' THEN ? ELSE rejection_reason END WHERE id = ?',
            [trimmedComment, trimmedComment, fileId]
        );

        if (fileRows && fileRows.length > 0) {
            const fileDoc = fileRows[0];
            const uploaderId = Number(fileDoc.uploaded_by);
            const actorId = Number(req.user?.userId || 0);
            
            const recipients = [];
            
            // 1. Notify the file uploader if they are not the one commenting
            if (uploaderId && uploaderId !== actorId) {
                recipients.push(uploaderId);
            }
            
            try {
                const { createNotifications, getAdminUserIds } = require('../utils/notificationService');
                const adminIds = await getAdminUserIds();
                
                // 2. Get auditors assigned to this office
                const [auditorRows] = await db.query(
                    `SELECT aaa.auditor_user_id as UserID
                     FROM auditor_area_assignments aaa
                     JOIN offices o ON o.OfficeID = ?
                     JOIN criteria c ON c.EventID = o.EventID
                     WHERE aaa.area_id = c.AreaID`,
                    [fileDoc.office_id]
                );
                const auditorUserIds = auditorRows.map(r => Number(r.UserID));
                
                // Merge admins and auditors, excluding the commenter
                const others = [...adminIds, ...auditorUserIds].filter(id => id !== actorId);
                recipients.push(...others);
                
                const uniqueRecipients = [...new Set(recipients)];
                
                if (uniqueRecipients.length > 0) {
                    const reqCode = fileDoc.RequirementCode || 'a requirement';
                    const officeName = fileDoc.OfficeName || 'your office';
                    
                    await createNotifications({
                        userIds: uniqueRecipients,
                        adminId: actorId,
                        title: 'New Comment on Uploaded File',
                        message: `A new comment was added to the uploaded file "${fileDoc.display_name}" for requirement ${reqCode} in ${officeName}.`,
                        type: 'info',
                        relatedTable: 'requirement_file_comment',
                        relatedId: Number(fileDoc.office_id),
                        meta: {
                            officeId: Number(fileDoc.office_id),
                            requirementId: Number(fileDoc.requirement_id),
                            openSubmission: true
                        }
                    });
                }
            } catch (notifErr) {
                console.error('Failed to notify about comment:', notifErr);
            }
        }

        res.json({ success: true, message: 'Document comment updated successfully', comment: trimmedComment });
    } catch (error) {
        console.error('Error updating evidence document comment:', error);
        res.status(500).json({ success: false, message: 'Error updating document comment', error: error.message });
    }
});

// Update review status (Approved, Rejected, Pending) for an evidence file
router.patch('/:requirementId/file/:fileId/review', auth, async (req, res) => {
    try {
        const db = require('../db');
        const { fileId } = req.params;
        const { status, reason } = req.body;
        const actorRole = Number(req.user?.roleId || 0);
        const actorId = Number(req.user?.userId || 0);

        // Role check: Only Admin (1) and Auditor (4)
        if (actorRole !== 1 && actorRole !== 4) {
            return res.status(403).json({ success: false, message: 'Unauthorized: Only Auditors and Admins can review evidence files' });
        }

        if (!['approved', 'rejected', 'pending'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid review status. Must be approved, rejected, or pending' });
        }

        await ensureReviewColumns(db);

        // Fetch file and requirement metadata
        const [fileRows] = await db.query(
            `SELECT opd.id, opd.uploaded_by, opd.display_name, opd.file_name, opd.office_id, opd.requirement_id, opd.comment,
                    r.RequirementCode, o.OfficeName
             FROM office_proof_documents opd
             LEFT JOIN requirements r ON opd.requirement_id = r.RequirementID
             LEFT JOIN offices o ON opd.office_id = o.OfficeID
             WHERE opd.id = ? LIMIT 1`,
            [fileId]
        );

        if (!fileRows || fileRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Evidence document not found' });
        }

        const fileDoc = fileRows[0];
        const existingComment = fileDoc.comment || '';
        const trimmedReason = reason !== undefined ? (reason ? reason.trim() : '') : existingComment;
        const reviewedBy = status === 'pending' ? null : actorId;
        const reviewedAt = status === 'pending' ? null : new Date();

        if (status === 'pending') {
            await db.query(
                `UPDATE office_proof_documents 
                 SET review_status = 'pending', rejection_reason = NULL, reviewed_by = NULL, reviewed_at = NULL 
                 WHERE id = ?`,
                [fileId]
            );
        } else {
            await db.query(
                `UPDATE office_proof_documents 
                 SET review_status = ?, 
                     rejection_reason = ?, 
                     comment = CASE WHEN ? != '' THEN ? ELSE comment END,
                     reviewed_by = ?, 
                     reviewed_at = CURRENT_TIMESTAMP 
                 WHERE id = ?`,
                [status, status === 'rejected' ? trimmedReason : null, trimmedReason, trimmedReason, actorId, fileId]
            );
        }

        // Fetch reviewer name
        const [reviewerRows] = await db.query('SELECT FirstName, LastName FROM users WHERE UserID = ? LIMIT 1', [actorId]);
        const reviewerName = reviewerRows && reviewerRows.length > 0
            ? `${reviewerRows[0].FirstName || ''} ${reviewerRows[0].LastName || ''}`.trim()
            : 'Auditor';

        // Notify uploader if reviewer is not the uploader
        const uploaderId = Number(fileDoc.uploaded_by);
        if (uploaderId && uploaderId !== actorId) {
            try {
                const { createNotifications } = require('../utils/notificationService');
                const reqCode = fileDoc.RequirementCode || 'a requirement';
                const fileTitle = fileDoc.display_name || fileDoc.file_name || 'evidence document';
                
                const statusTitle = status === 'approved' 
                    ? 'Evidence Approved' 
                    : status === 'rejected' 
                    ? 'Evidence Rejected - Action Required' 
                    : 'Evidence Review Reset';

                const statusMessage = status === 'approved'
                    ? `Your evidence "${fileTitle}" for ${reqCode} has been approved.`
                    : status === 'rejected'
                    ? `Your evidence "${fileTitle}" for ${reqCode} was rejected. Note: ${trimmedReason || 'Needs revision'}`
                    : `Your evidence "${fileTitle}" for ${reqCode} review status was reset to pending.`;

                await createNotifications({
                    userIds: [uploaderId],
                    adminId: actorId,
                    title: statusTitle,
                    message: statusMessage,
                    type: status === 'approved' ? 'success' : status === 'rejected' ? 'warning' : 'info',
                    relatedTable: 'requirement_file_review',
                    relatedId: Number(fileDoc.office_id),
                    meta: {
                        officeId: Number(fileDoc.office_id),
                        requirementId: Number(fileDoc.requirement_id),
                        openSubmission: true
                    }
                });
            } catch (notifErr) {
                console.error('Failed to notify uploader of review status:', notifErr);
            }
        }

        res.json({
            success: true,
            message: `Evidence marked as ${status}`,
            reviewStatus: status,
            comment: trimmedReason || existingComment,
            rejectionReason: status === 'rejected' ? trimmedReason : '',
            reviewedBy: reviewedBy,
            reviewedAt: reviewedAt,
            reviewerName: reviewerName
        });
    } catch (error) {
        console.error('Error updating evidence review status:', error);
        res.status(500).json({ success: false, message: 'Error updating review status', error: error.message });
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

        // Delete from Supabase Storage bucket (if hosted on cloud)
        try {
            const { deleteFromSupabaseBucket } = require('../utils/supabaseStorage');
            await deleteFromSupabaseBucket(filePath, 'proof-documents');
        } catch (sErr) {
            console.warn('Supabase Storage file deletion warning:', sErr);
        }

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
                    'UPDATE requirement_user_assignments SET HasUploaded = FALSE WHERE RequirementID = ? AND UserID = ?',
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

        const db = require('../db');

        // Check max 40 files per user per requirement
        const [countRows] = await db.query(
            'SELECT COUNT(*) as count FROM requirement_user_files WHERE RequirementID = ? AND UserID = ?',
            [requirementId, userId]
        );
        if (countRows && countRows[0]?.count >= 40) {
            return res.status(400).json({ success: false, message: 'Maximum limit of 40 uploaded files reached for this requirement.' });
        }

        // Get requirement info for event and office
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

        const safeOfficeName = officeName.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 40);
        const { uploadToSupabaseBucket } = require('../utils/supabaseStorage');

        const destPath = require('path').join(eventDir, finalFileName);
        let filePath = `/uploads/events/${safeEventName}/${finalFileName}`;

        try {
            const supabaseRes = await uploadToSupabaseBucket(
                req.file.path, 
                `events/${safeEventName}/${safeOfficeName}/${finalFileName}`, 
                req.file.mimetype
            );
            if (supabaseRes && supabaseRes.publicUrl) {
                filePath = supabaseRes.publicUrl;
            }
        } catch (supabaseErr) {
            console.warn('Supabase cloud storage upload notice (falling back to local disk):', supabaseErr.message);
            fs.renameSync(req.file.path, destPath);
        }

        // Clean up temp file if still present
        if (fs.existsSync(req.file.path)) {
            try { fs.unlinkSync(req.file.path); } catch (e) {}
        }

        const fileComment = comment ? comment.trim() : '';

        const [insertResult] = await db.query(
            'INSERT INTO office_proof_documents (office_id, uploaded_by, requirement_id, file_name, display_name, comment, file_path, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
            [resolvedOfficeId, userId, requirementId, finalFileName, fileTitle, fileComment, filePath]
        );

        // Update HasUploaded flag to TRUE
        await db.query(
            'UPDATE requirement_user_assignments SET HasUploaded = TRUE WHERE RequirementID = ? AND UserID = ?',
            [requirementId, userId]
        );

        try {
            const { createNotifications, getAdminUserIds } = require('../utils/notificationService');
            const actorUserId = Number(req.user?.userId || userId);
            const adminIds = await getAdminUserIds();
            
            // Get office heads
            const [headRows] = await db.query(
                `SELECT u.UserID 
                 FROM users u
                 JOIN headofoffice h ON u.UserID = h.UserID
                 JOIN office_head_assignments oha ON h.HeadID = oha.HeadID
                 WHERE oha.OfficeID = ?`,
                [resolvedOfficeId]
            );
            const headUserIds = headRows.map(r => Number(r.UserID));
            
            // Get auditors assigned to this office
            const [auditorRows] = await db.query(
                `SELECT aaa.auditor_user_id as UserID
                 FROM auditor_area_assignments aaa
                 JOIN offices o ON o.OfficeID = ?
                 JOIN criteria c ON c.EventID = o.EventID
                 WHERE aaa.area_id = c.AreaID`,
                [resolvedOfficeId]
            );
            const auditorUserIds = auditorRows.map(r => Number(r.UserID));
            
            const allRecipientIds = [...new Set([...adminIds, ...headUserIds, ...auditorUserIds])];
            const uploaderDisplay = userName.replace(/_/g, ' ');

            if (allRecipientIds.length > 0 && resolvedOfficeId) {
                await createNotifications({
                    userIds: allRecipientIds.filter((id) => id !== actorUserId),
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
            console.error('Failed to notify about file upload:', notifErr);
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
