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

// Get all uploaded files for a user and requirement (scoped by officeId if provided)
router.get('/:requirementId/user-file/:userId', auth, async (req, res) => {
    try {
        const db = require('../db');
        const { requirementId, userId } = req.params;
        const officeId = req.query.officeId ? Number(req.query.officeId) : null;
        
        let rows = [];
        let whereClause = 'WHERE opd.requirement_id = ? AND opd.uploaded_by = ?';
        let queryParams = [requirementId, userId];

        if (officeId) {
            whereClause += ' AND opd.office_id = ?';
            queryParams.push(officeId);
        }

        try {
            const [r] = await db.query(
                `SELECT opd.id, opd.file_name, opd.display_name, opd.comment, opd.file_path, opd.uploaded_at, opd.sort_order, opd.uploaded_by, opd.office_id,
                        opd.review_status, opd.rejection_reason, opd.reviewed_by, opd.reviewed_at,
                        u.FirstName as reviewer_first_name, u.LastName as reviewer_last_name
                 FROM office_proof_documents opd
                 LEFT JOIN users u ON opd.reviewed_by = u.UserID
                 ${whereClause} 
                 ORDER BY opd.sort_order ASC, opd.id ASC`,
                queryParams
            );
            rows = r;
        } catch (e) {
            await ensureReviewColumns(db);
            const [r] = await db.query(
                `SELECT opd.id, opd.file_name, opd.display_name, opd.comment, opd.file_path, opd.uploaded_at, opd.sort_order, opd.uploaded_by, opd.office_id,
                        opd.review_status, opd.rejection_reason, opd.reviewed_by, opd.reviewed_at,
                        u.FirstName as reviewer_first_name, u.LastName as reviewer_last_name
                 FROM office_proof_documents opd
                 LEFT JOIN users u ON opd.reviewed_by = u.UserID
                 ${whereClause} 
                 ORDER BY opd.sort_order ASC, opd.id ASC`,
                queryParams
            );
            rows = r;
        }

        if (!rows || rows.length === 0) {
            return res.json({ success: true, message: 'No files found for this user and requirement', files: [], file: null });
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
                reviewerName: reviewerName,
                uploaded_by: file.uploaded_by,
                userId: file.uploaded_by,
                office_id: file.office_id
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
router.patch('/:requirementId/user-file/:userId/reorder', auth, async (req, res) => {
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
                'UPDATE office_proof_documents SET sort_order = ? WHERE id = ?',
                [i, orderedIds[i]]
            );
        }

        const { emitDataChange } = require('../socket');
        emitDataChange('requirements', { action: 'reorder', requirementId, userId, orderedIds });

        res.json({ success: true, message: 'Files reordered successfully' });
    } catch (error) {
        console.error('Error reordering user files:', error);
        res.status(500).json({ success: false, message: 'Error reordering files', error: error.message });
    }
});

// Rename custom display title for an evidence file
router.patch('/:requirementId/file/:fileId/rename', auth, async (req, res) => {
    try {
        const db = require('../db');
        const { fileId } = req.params;
        const { displayName } = req.body;
        if (!displayName || !displayName.trim()) {
            return res.status(400).json({ success: false, message: 'Display name is required' });
        }

        let trimmedTitle = displayName.trim();
        // Remove trailing file extension from custom title if present
        const dotIdx = trimmedTitle.lastIndexOf('.');
        if (dotIdx > 0 && dotIdx >= trimmedTitle.length - 6) {
            trimmedTitle = trimmedTitle.substring(0, dotIdx).trim() || trimmedTitle;
        }

        // 1. Get current document row
        const [rows] = await db.query(
            'SELECT id, file_name, display_name, file_path, uploaded_by FROM office_proof_documents WHERE id = ? LIMIT 1',
            [fileId]
        );

        if (!rows || rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }

        const doc = rows[0];

        // Authorization: allow admins, or auditors only for their own uploaded files
        const actorRole = Number(req.user?.roleId || 0);
        const actorId = Number(req.user?.userId || 0);
        if (actorRole === 4 && Number(doc.uploaded_by) !== actorId) {
            return res.status(403).json({ success: false, message: 'Forbidden: auditors may only rename their own files' });
        }

        // 2. Update DB with new custom display title
        await db.query(
            'UPDATE office_proof_documents SET display_name = ? WHERE id = ?',
            [trimmedTitle, fileId]
        );

        res.json({
            success: true,
            message: 'Document renamed successfully',
            displayName: trimmedTitle,
            fileName: doc.file_name,
            file_path: doc.file_path,
            url: doc.file_path
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

        try {
            const { emitDataChange } = require('../socket');
            emitDataChange('requirements', { 
                action: 'comment', 
                requirementId: Number(req.params.requirementId), 
                fileId: Number(fileId), 
                comment: trimmedComment 
            });
        } catch (sErr) {}

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

        // Role check: Only Admin (1) can approve or reject evidence
        if (actorRole !== 1) {
            return res.status(403).json({ success: false, message: 'Unauthorized: Only Admins can approve or reject evidence files' });
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

        try {
            const { emitDataChange } = require('../socket');
            emitDataChange('requirements', {
                action: 'review',
                requirementId: Number(req.params.requirementId),
                fileId: Number(fileId),
                userId: uploaderId,
                reviewStatus: status,
                comment: trimmedReason || existingComment,
                rejectionReason: status === 'rejected' ? trimmedReason : '',
                reviewedBy: reviewedBy,
                reviewedAt: reviewedAt,
                reviewerName: reviewerName
            });
        } catch (sErr) {}

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

// Delete uploaded file for a user and requirement (unsubmit specific file or latest, scoped to officeId)
router.delete('/:requirementId/file/:userId', auth, async (req, res) => {
    try {
        const db = require('../db');
        const { requirementId, userId } = req.params;
        const targetFileId = req.query.fileId ? Number(req.query.fileId) : null;
        const officeId = req.query.officeId ? Number(req.query.officeId) : null;

        // Authorization: auditors may only delete their own files
        const actorRole = Number(req.user?.roleId || 0);
        const actorId = Number(req.user?.userId || 0);
        if (actorRole === 4 && actorId !== Number(userId)) {
            return res.status(403).json({ success: false, message: 'Forbidden: auditors may only delete their own files' });
        }

        let rows = [];
        if (targetFileId) {
            let q = 'SELECT id, office_id, file_name, display_name, file_path FROM office_proof_documents WHERE id = ? AND requirement_id = ? AND uploaded_by = ?';
            let p = [targetFileId, requirementId, userId];
            if (officeId) {
                q += ' AND office_id = ?';
                p.push(officeId);
            }
            q += ' LIMIT 1';
            [rows] = await db.query(q, p);
        } else {
            let q = 'SELECT id, office_id, file_name, display_name, file_path FROM office_proof_documents WHERE requirement_id = ? AND uploaded_by = ?';
            let p = [requirementId, userId];
            if (officeId) {
                q += ' AND office_id = ?';
                p.push(officeId);
            }
            q += ' ORDER BY uploaded_at DESC LIMIT 1';
            [rows] = await db.query(q, p);
        }

        if (!rows || rows.length === 0) {
            return res.status(404).json({ success: false, message: 'No uploaded file found for this user and requirement' });
        }

        const file = rows[0];
        const resolvedFileOfficeId = file.office_id || officeId || null;
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
                [resolvedFileOfficeId, requirementId]
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

        // Check remaining uploaded files count for this user & requirement & office
        let countQ = 'SELECT COUNT(*) as cnt FROM office_proof_documents WHERE requirement_id = ? AND uploaded_by = ?';
        let countP = [requirementId, userId];
        if (resolvedFileOfficeId) {
            countQ += ' AND office_id = ?';
            countP.push(resolvedFileOfficeId);
        }
        const [remaining] = await db.query(countQ, countP);

        const remainingCount = remaining[0]?.cnt || 0;
        if (remainingCount === 0) {
            try {
                if (resolvedFileOfficeId) {
                    await db.query(
                        'UPDATE requirement_user_assignments SET HasUploaded = FALSE WHERE RequirementID = ? AND UserID = ? AND OfficeID = ?',
                        [requirementId, userId, resolvedFileOfficeId]
                    );
                } else {
                    await db.query(
                        'UPDATE requirement_user_assignments SET HasUploaded = FALSE WHERE RequirementID = ? AND UserID = ?',
                        [requirementId, userId]
                    );
                }
            } catch (uErr) {
                console.warn('Failed to update requirement_user_assignments HasUploaded flag:', uErr);
            }
        }

        try {
            const { emitDataChange } = require('../socket');
            emitDataChange('requirements', { action: 'unsubmit', requirementId, userId, officeId: resolvedFileOfficeId, fileId: file.id });
        } catch (sockErr) {
            // ignore
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
router.get('/all', auth, requirementsController.getAllRequirements);
router.get('/event/:eventId', auth, requirementsController.getRequirementsByEvent);
router.get('/criteria/:criteriaId', auth, requirementsController.getRequirementsByCriteria);
router.post('/add', auth, requirementsController.addRequirement);
router.put('/update/:id', auth, requirementsController.updateRequirement);
router.post('/delete', auth, requirementsController.deleteRequirements);

// User assignment routes
router.post('/assign-users', auth, requirementsController.assignUsersToRequirement);
router.get('/assigned-users/:requirementId', auth, requirementsController.getAssignedUsers);
router.get('/my-assignments', auth, requirementsController.getMyAssignments);
router.delete('/assignment/:assignmentId', auth, requirementsController.removeUserAssignment);
router.get('/user-assignment-count/:userId', auth, requirementsController.getUserAssignmentCount);
router.get('/available-users', auth, requirementsController.getAvailableUsersForAssignment);
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

        // Check max 40 files per user per requirement for this specific office
        const resolvedOfficeId = officeId ? Number(officeId) : null;
        let currentFileCount = 0;
        try {
            let countQ = 'SELECT COUNT(*) as count FROM office_proof_documents WHERE requirement_id = ? AND uploaded_by = ?';
            let countP = [requirementId, userId];
            if (resolvedOfficeId) {
                countQ += ' AND office_id = ?';
                countP.push(resolvedOfficeId);
            }
            const [countRows] = await db.query(countQ, countP);
            if (countRows && countRows.length > 0) {
                currentFileCount = Number(countRows[0].count || countRows[0].Count || 0);
            }
        } catch (cErr) {
            console.warn('Count check fallback:', cErr.message);
        }
        if (currentFileCount >= 40) {
            return res.status(400).json({ success: false, message: 'Maximum limit of 40 uploaded files reached for this requirement in this office.' });
        }

        // Get requirement info for event and office
        const [rows] = await db.query(`
            SELECT r.RequirementID, r.RequirementCode, r.Description, c.EventID, e.EventName, e.EventCode, rua.OfficeID, c.CriteriaName, c.CriteriaCode, a.AreaID, a.AreaCode, a.AreaName
            FROM requirements r
            LEFT JOIN criteria c ON r.CriteriaID = c.CriteriaID
            LEFT JOIN Events e ON c.EventID = e.EventID
            LEFT JOIN areas a ON c.AreaID = a.AreaID
            LEFT JOIN requirement_user_assignments rua ON rua.RequirementID = r.RequirementID AND rua.UserID = ? ${resolvedOfficeId ? 'AND rua.OfficeID = ?' : ''}
            WHERE r.RequirementID = ?
            LIMIT 1
        `, resolvedOfficeId ? [userId, resolvedOfficeId, requirementId] : [userId, requirementId]);

        if (!rows || rows.length === 0) {
            return res.status(400).json({ success: false, message: 'Requirement not found' });
        }

        const reqRow = rows[0];
        const EventName = reqRow.EventName || reqRow.eventname || '';
        const EventCode = reqRow.EventCode || reqRow.eventcode || EventName || 'Event';
        const OfficeID = reqRow.OfficeID || reqRow.officeid || null;
        const finalResolvedOfficeId = resolvedOfficeId || (OfficeID ? Number(OfficeID) : null);
        const Description = reqRow.Description || reqRow.description || '';
        const CriteriaName = reqRow.CriteriaName || reqRow.criterianame || '';
        const CriteriaCode = reqRow.CriteriaCode || reqRow.criteriacode || CriteriaName || '';
        const RequirementCode = reqRow.RequirementCode || reqRow.requirementcode || '';
        const AreaCode = reqRow.AreaCode || reqRow.areacode || '';
        const AreaName = reqRow.AreaName || reqRow.areaname || '';
        
        let officeName = 'Office';
        if (finalResolvedOfficeId) {
            try {
                const [officeRows] = await db.query('SELECT OfficeName FROM offices WHERE OfficeID = ?', [finalResolvedOfficeId]);
                if (officeRows && officeRows.length > 0) {
                    officeName = officeRows[0].OfficeName || officeRows[0].officename || 'Office';
                }
            } catch (oErr) {
                console.warn('Office lookup notice:', oErr.message);
            }
        }
        
        let userName = 'User';
        try {
            const [userRows] = await db.query('SELECT FirstName, LastName FROM users WHERE UserID = ?', [userId]);
            if (userRows && userRows.length > 0) {
                const fn = userRows[0].FirstName || userRows[0].firstname || '';
                const ln = userRows[0].LastName || userRows[0].lastname || '';
                userName = `${fn}_${ln}`.trim() || 'User';
            }
        } catch (uErr) {
            console.warn('User lookup notice:', uErr.message);
        }

        const safeEventName = (EventCode || EventName || 'Event').replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 40);
        const safeArea = ((AreaCode || AreaName) || 'Area').replace(/[^a-zA-Z0-9-]/g, '.').substring(0, 40);
        const safeCriteriaCode = (CriteriaCode || CriteriaName || 'Criteria').replace(/[^a-zA-Z0-9-]/g, '.').substring(0, 40);
        const safeReqCode = (RequirementCode || 'Req').replace(/[^a-zA-Z0-9-]/g, '.').substring(0, 40);
        const safeUserName = userName.replace(/[^a-zA-Z0-9-]/g, '.').substring(0, 40);
        const ext = path.extname(req.file.originalname);

        const fileTitle = (displayName && displayName.trim()) 
            ? displayName.trim() 
            : path.basename(req.file.originalname, ext);

        const safeTitle = fileTitle.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 50);

        // Clean filename pattern without random numbers or timestamps
        const eventDir = path.join(__dirname, `../uploads/events/${safeEventName}`);
        if (!fs.existsSync(eventDir)) {
            fs.mkdirSync(eventDir, { recursive: true });
        }

        const baseFileName = `${safeEventName}.${safeArea}.${safeCriteriaCode}.${safeReqCode}.${safeUserName}_${safeTitle}`;
        let finalFileName = `${baseFileName}${ext}`;

        let collisionCounter = 1;
        while (fs.existsSync(path.join(eventDir, finalFileName))) {
            collisionCounter++;
            finalFileName = `${baseFileName}_${collisionCounter}${ext}`;
        }

        const safeOfficeName = officeName.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 40);
        const { uploadToSupabaseBucket } = require('../utils/supabaseStorage');

        const destPath = path.join(eventDir, finalFileName);
        let filePath = `/uploads/events/${safeEventName}/${finalFileName}`;
        let uploadedToCloud = false;

        try {
            const supabaseRes = await uploadToSupabaseBucket(
                req.file.path, 
                `events/${safeEventName}/${safeOfficeName}/${finalFileName}`, 
                req.file.mimetype
            );
            if (supabaseRes && supabaseRes.publicUrl) {
                filePath = supabaseRes.publicUrl;
                uploadedToCloud = true;
            }
        } catch (supabaseErr) {
            console.warn('Supabase cloud storage upload notice (falling back to local disk):', supabaseErr.message);
        }

        // Always ensure local copy exists as well (or if cloud upload fell back)
        try {
            if (!uploadedToCloud || !fs.existsSync(destPath)) {
                fs.copyFileSync(req.file.path, destPath);
            }
        } catch (copyErr) {
            console.warn('Local disk file write warning:', copyErr.message);
        }

        const fileComment = comment ? comment.trim() : '';

        // Calculate next sort_order so latest uploaded file is always at the bottom
        let nextSortOrder = 1;
        try {
            let sortQ = 'SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_sort FROM office_proof_documents WHERE requirement_id = ? AND uploaded_by = ?';
            let sortP = [requirementId, userId];
            if (finalResolvedOfficeId) {
                sortQ += ' AND office_id = ?';
                sortP.push(finalResolvedOfficeId);
            }
            const [sortRows] = await db.query(sortQ, sortP);
            if (sortRows && sortRows.length > 0) {
                nextSortOrder = Number(sortRows[0].next_sort || sortRows[0].next_sort || 1);
            }
        } catch (sErr) {
            console.warn('Sort order determination warning:', sErr.message);
        }

        await ensureReviewColumns(db);

        const [insertResult] = await db.query(
            'INSERT INTO office_proof_documents (office_id, uploaded_by, requirement_id, file_name, display_name, comment, file_path, sort_order, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())',
            [finalResolvedOfficeId, userId, requirementId, finalFileName, fileTitle, fileComment, filePath, nextSortOrder]
        );

        // Update HasUploaded flag to TRUE for the specific office
        try {
            if (finalResolvedOfficeId) {
                await db.query(
                    'UPDATE requirement_user_assignments SET HasUploaded = TRUE WHERE RequirementID = ? AND UserID = ? AND OfficeID = ?',
                    [requirementId, userId, finalResolvedOfficeId]
                );
            } else {
                await db.query(
                    'UPDATE requirement_user_assignments SET HasUploaded = TRUE WHERE RequirementID = ? AND UserID = ?',
                    [requirementId, userId]
                );
            }
        } catch (hasUpErr) {
            console.warn('HasUploaded flag update notice:', hasUpErr.message);
        }

        try {
            const { createNotifications, getAdminUserIds } = require('../utils/notificationService');
            const actorUserId = Number(req.user?.userId || userId);
            const adminIds = await getAdminUserIds();
            
            let headUserIds = [];
            let auditorUserIds = [];

            if (finalResolvedOfficeId) {
                try {
                    // Get office heads
                    const [headRows] = await db.query(
                        `SELECT u.UserID 
                         FROM users u
                         JOIN headofoffice h ON u.UserID = h.UserID
                         JOIN office_head_assignments oha ON h.HeadID = oha.HeadID
                         WHERE oha.OfficeID = ?`,
                        [finalResolvedOfficeId]
                    );
                    headUserIds = (headRows || []).map(r => Number(r.UserID || r.userid)).filter(Boolean);
                } catch (hErr) {}
                
                try {
                    // Get auditors assigned to this office
                    const [auditorRows] = await db.query(
                        `SELECT aaa.auditor_user_id as UserID
                         FROM auditor_area_assignments aaa
                         JOIN offices o ON o.OfficeID = ?
                         JOIN criteria c ON c.EventID = o.EventID
                         WHERE aaa.area_id = c.AreaID`,
                        [finalResolvedOfficeId]
                    );
                    auditorUserIds = (auditorRows || []).map(r => Number(r.UserID || r.userid)).filter(Boolean);
                } catch (aErr) {}
            }
            
            const allRecipientIds = [...new Set([...adminIds, ...headUserIds, ...auditorUserIds])];
            const uploaderDisplay = userName.replace(/_/g, ' ');

            if (allRecipientIds.length > 0 && finalResolvedOfficeId) {
                await createNotifications({
                    userIds: allRecipientIds.filter((id) => id !== actorUserId),
                    adminId: actorUserId,
                    title: 'New evidence uploaded',
                    message: `${uploaderDisplay} uploaded evidence for ${RequirementCode || 'a requirement'} in ${officeName}.`,
                    type: 'info',
                    relatedTable: 'requirement_file_upload',
                    relatedId: Number(finalResolvedOfficeId),
                    meta: {
                        officeId: Number(finalResolvedOfficeId),
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
                    OfficeID: finalResolvedOfficeId ? Number(finalResolvedOfficeId) : null,
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

        const insertedId = insertResult?.insertId || insertResult?.[0]?.id || insertResult?.[0]?.ID || null;

        try {
            const { emitDataChange } = require('../socket');
            emitDataChange('requirements', { action: 'upload', requirementId, userId, officeId: finalResolvedOfficeId });
        } catch (sockErr) {
            // ignore
        }

        res.json({
            success: true,
            message: 'File uploaded successfully',
            file: {
                id: insertedId,
                fileName: finalFileName,
                displayName: fileTitle,
                comment: fileComment,
                originalname: req.file.originalname,
                url: filePath,
                office_id: finalResolvedOfficeId,
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
