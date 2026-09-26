const express = require('express');
const router = express.Router();
const db = require('../db');
const { recordLog } = require('../controllers/logsController');
const AreasController = require('../controllers/AreasController');
const { auth, restrictAuditor } = require('../middleware/auth');

// Helper to ensure auditor_area_assignments table exists
const ensureAssignmentsTable = async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS auditor_area_assignments (
                id SERIAL PRIMARY KEY,
                auditor_user_id INT NOT NULL,
                area_id INT NOT NULL,
                assigned_by INT DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT unique_auditor_area UNIQUE (auditor_user_id, area_id)
            )
        `);
    } catch (e) {
        console.error('Error creating auditor_area_assignments table:', e);
    }
};
ensureAssignmentsTable();

// GET assigned areas for an auditor user
router.get('/assignments/:userId', auth, async (req, res) => {
    try {
        await ensureAssignmentsTable();
        const { userId } = req.params;
        const [rows] = await db.query(
            `SELECT a.id, a.auditor_user_id, a.area_id, a.created_at, ar.AreaCode, ar.AreaName, ar.EventID, e.EventName
             FROM auditor_area_assignments a
             JOIN areas ar ON a.area_id = ar.AreaID
             LEFT JOIN Events e ON ar.EventID = e.EventID
             WHERE a.auditor_user_id = ?`,
            [userId]
        );
        const formatted = (rows || []).map(r => ({
            id: r.id,
            auditor_user_id: r.auditor_user_id,
            area_id: r.area_id ?? r.AreaID ?? r.areaid,
            AreaID: r.area_id ?? r.AreaID ?? r.areaid,
            AreaCode: r.AreaCode ?? r.areacode ?? '',
            AreaName: r.AreaName ?? r.areaname ?? '',
            EventID: r.EventID ?? r.eventid,
            EventName: r.EventName ?? r.eventname ?? '',
            created_at: r.created_at,
        }));
        res.json({ success: true, assignments: formatted });
    } catch (err) {
        console.error('Error fetching auditor assignments:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch assignments', error: err.message });
    }
});

// GET auditors assigned to an office (via area assignments)
router.get('/auditors/office/:officeId', auth, async (req, res) => {
    try {
        await ensureAssignmentsTable();
        const { officeId } = req.params;
        const [rows] = await db.query(
            `SELECT u.UserID, u.FirstName, u.LastName, u.Email, u.ProfilePic,
                    string_agg(DISTINCT ar.AreaCode, ', ') AS AreaCode,
                    string_agg(DISTINCT ar.AreaName, ', ') AS AreaName
             FROM auditor_area_assignments aaa
             JOIN users u ON aaa.auditor_user_id = u.UserID
             JOIN areas ar ON aaa.area_id = ar.AreaID
             JOIN criteria c ON ar.AreaID = c.AreaID
             JOIN requirements r ON c.CriteriaID = r.CriteriaID
             JOIN compliancestatusoffices cso ON r.RequirementID = cso.RequirementID
             WHERE cso.OfficeID = ?
             GROUP BY u.UserID, u.FirstName, u.LastName, u.Email, u.ProfilePic`,
            [officeId]
        );
        const auditorMap = new Map();
        (rows || []).forEach(r => {
            const uid = r.UserID ?? r.userid ?? r.id;
            if (uid && !auditorMap.has(uid)) {
                auditorMap.set(uid, {
                    UserID: uid,
                    FirstName: r.FirstName ?? r.firstname ?? '',
                    LastName: r.LastName ?? r.lastname ?? '',
                    Email: r.Email ?? r.email ?? '',
                    ProfilePic: r.ProfilePic ?? r.profilepic ?? null,
                    AreaCode: r.AreaCode ?? r.areacode ?? '',
                    AreaName: r.AreaName ?? r.areaname ?? '',
                });
            }
        });
        res.json({ success: true, auditors: Array.from(auditorMap.values()) });
    } catch (err) {
        console.error('Error fetching office auditors:', err);
        res.status(500).json({ success: false, auditors: [] });
    }
});

// POST assign auditor to areas (accepts areaIds array)
router.post('/assign', auth, restrictAuditor, async (req, res) => {
    try {
        await ensureAssignmentsTable();
        const { userId, areaIds } = req.body || {};
        if (!userId || !Array.isArray(areaIds)) {
            return res.status(400).json({ success: false, message: 'userId and areaIds array are required' });
        }

        // Delete existing area assignments for this auditor
        await db.query('DELETE FROM auditor_area_assignments WHERE auditor_user_id = ?', [userId]);

        // Insert new area assignments & reassign any area from other auditors
        if (areaIds.length > 0) {
            for (const areaId of areaIds) {
                await db.query(
                    'DELETE FROM auditor_area_assignments WHERE area_id = ? AND auditor_user_id != ?',
                    [areaId, userId]
                );
                await db.query(
                    'INSERT IGNORE INTO auditor_area_assignments (auditor_user_id, area_id, assigned_by) VALUES (?, ?, ?)',
                    [userId, areaId, req.user?.userId || null]
                );
            }
        }

        // Fetch updated assigned area names for response/logging
        const [assignedAreas] = await db.query(
            `SELECT ar.AreaID, ar.AreaCode, ar.AreaName 
             FROM auditor_area_assignments a 
             JOIN areas ar ON a.area_id = ar.AreaID 
             WHERE a.auditor_user_id = ?`,
            [userId]
        );

        if (req.user?.userId) {
            try {
                const [auditorUserRows] = await db.query(
                    'SELECT FirstName, LastName, Email FROM users WHERE UserID = ?',
                    [userId]
                );
                const auditorRow = auditorUserRows?.[0];
                const auditorName = auditorRow 
                    ? `${auditorRow.FirstName || ''} ${auditorRow.LastName || ''}`.trim() || auditorRow.Email
                    : `Auditor #${userId}`;

                recordLog(req.user.userId, 'AuditorAssignedAreas', {
                    AuditorUserID: Number(userId),
                    AuditorName: auditorName,
                    AssignedAreaCount: areaIds.length,
                    Areas: assignedAreas
                });
            } catch (e) {
                console.error('Failed to record AuditorAssignedAreas log:', e);
            }
        }

        try {
            const { createNotifications } = require('../utils/notificationService');
            const targetAuditorId = Number(userId);

            if (assignedAreas.length > 0) {
                const areaNames = assignedAreas
                    .map(a => a.AreaCode ? (a.AreaName ? `${a.AreaCode} (${a.AreaName})` : a.AreaCode) : a.AreaName)
                    .filter(Boolean)
                    .join(', ');

                let firstOfficeId = null;
                try {
                    const areaIdList = assignedAreas.map(a => Number(a.AreaID)).filter(Boolean);
                    if (areaIdList.length > 0) {
                        const [officeMatch] = await db.query(
                            `SELECT DISTINCT o.OfficeID 
                             FROM offices o
                             JOIN compliancestatusoffices cso ON o.OfficeID = cso.OfficeID
                             JOIN requirements r ON cso.RequirementID = r.RequirementID
                             JOIN criteria c ON r.CriteriaID = c.CriteriaID
                             WHERE c.AreaID IN (?)
                             LIMIT 1`,
                            [areaIdList]
                        );
                        if (officeMatch && officeMatch.length > 0) {
                            firstOfficeId = officeMatch[0].OfficeID;
                        }
                    }
                } catch (e) {
                    console.warn('Could not resolve first office for auditor assignment notification:', e.message);
                }

                await createNotifications({
                    userIds: [targetAuditorId],
                    adminId: req.user?.userId || null,
                    title: 'Auditor Area Assignment',
                    message: `You have been assigned as the external auditor for: ${areaNames}.`,
                    type: 'info',
                    relatedTable: 'auditor_assignments',
                    relatedId: targetAuditorId,
                    meta: {
                        userId: targetAuditorId,
                        assignedCount: assignedAreas.length,
                        areaIds: assignedAreas.map(a => Number(a.AreaID)),
                        officeId: firstOfficeId,
                        openSubmission: false
                    }
                });
            } else {
                await createNotifications({
                    userIds: [targetAuditorId],
                    adminId: req.user?.userId || null,
                    title: 'Auditor Assignments Updated',
                    message: 'Your assigned areas have been updated (no active areas currently assigned).',
                    type: 'info',
                    relatedTable: 'auditor_assignments',
                    relatedId: targetAuditorId,
                    meta: {
                        userId: targetAuditorId,
                        assignedCount: 0,
                        areaIds: [],
                        openSubmission: false
                    }
                });
            }
        } catch (notifErr) {
            console.error('Failed to notify auditor about area assignments:', notifErr);
        }

        res.json({
            success: true,
            message: 'Auditor areas assigned successfully',
            assignedAreas
        });
    } catch (err) {
        console.error('Error assigning auditor areas:', err);
        res.status(500).json({ success: false, message: 'Failed to assign auditor areas', error: err.message });
    }
});

// POST add area
router.post('/add', auth, restrictAuditor, AreasController.addArea);

// DELETE multiple areas
router.post('/delete', auth, restrictAuditor, AreasController.deleteAreas);

// UPDATE area
router.put('/:areaId', auth, restrictAuditor, async (req, res) => {
    try {
        const { areaId } = req.params;
        const { AreaCode, AreaName, Description } = req.body;

        if (!AreaCode || !AreaName) {
            return res.status(400).json({
                success: false,
                message: 'Area code and area name are required.'
            });
        }

        let result;
        try {
            // Preferred query for schemas with UpdatedAt column
            [result] = await db.query(
                `UPDATE areas
                 SET AreaCode = ?, AreaName = ?, Description = ?, UpdatedAt = NOW()
                 WHERE AreaID = ? AND IsActive = TRUE`,
                [AreaCode, AreaName, Description || null, areaId]
            );
        } catch (updateErr) {
            // Fallback for schemas without UpdatedAt column
            [result] = await db.query(
                `UPDATE areas
                 SET AreaCode = ?, AreaName = ?, Description = ?
                 WHERE AreaID = ? AND IsActive = TRUE`,
                [AreaCode, AreaName, Description || null, areaId]
            );
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Area not found or inactive.'
            });
        }

        const [rows] = await db.query(
            `SELECT AreaID, AreaCode, AreaName, EventID, Description, SortOrder, CreatedAt, UpdatedAt
             FROM areas
             WHERE AreaID = ?`,
            [areaId]
        );

        if (req.user && req.user.userId) {
            try { recordLog(req.user.userId, 'AreaUpdated', { AreaID: areaId, AreaName }); } catch (e) {}
        }
        return res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Error updating area:', error);
        if (error && error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'Area code already exists.'
            });
        }
        return res.status(500).json({
            success: false,
            message: 'Failed to update area',
            error: error.message
        });
    }
});

// GET all areas
router.get('/', auth, async (req, res) => {
    try {
        const roleId = Number(req.user?.roleId || 0);
        const userId = Number(req.user?.userId || 0);

        let auditorFilter = '';
        const params = [];

        if (roleId === 4) {
            auditorFilter = ' AND ar.AreaID IN (SELECT area_id FROM auditor_area_assignments WHERE auditor_user_id = ?)';
            params.push(userId);
        }

        const [areas] = await db.query(`
            SELECT 
                ar.AreaID,
                ar.AreaCode,
                ar.AreaName,
                ar.EventID,
                ar.Description,
                ar.SortOrder,
                ar.CreatedAt,
                ar.UpdatedAt,
                aaa.auditor_user_id AS AuditorUserID,
                TRIM(CONCAT(u.FirstName, ' ', u.LastName)) AS AuditorName
            FROM areas ar
            LEFT JOIN auditor_area_assignments aaa ON ar.AreaID = aaa.area_id
            LEFT JOIN users u ON aaa.auditor_user_id = u.UserID
            WHERE ar.IsActive = TRUE ${auditorFilter}
            ORDER BY ar.SortOrder ASC, ar.AreaCode ASC
        `, params);
        res.json({
            success: true,
            data: areas
        });
    } catch (error) {
        console.error('Error fetching areas:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch areas',
            error: error.message
        });
    }
});

// GET areas by event ID
router.get('/event/:eventId', auth, async (req, res) => {
    try {
        const { eventId } = req.params;
        const roleId = Number(req.user?.roleId || 0);
        const userId = Number(req.user?.userId || 0);

        let auditorFilter = '';
        const params = [eventId];

        if (roleId === 4) {
            auditorFilter = ' AND ar.AreaID IN (SELECT area_id FROM auditor_area_assignments WHERE auditor_user_id = ?)';
            params.push(userId);
        }

        const [areas] = await db.query(`
            SELECT 
                ar.AreaID,
                ar.AreaCode,
                ar.AreaName,
                ar.EventID,
                ar.Description,
                ar.SortOrder,
                ar.CreatedAt,
                ar.UpdatedAt,
                aaa.auditor_user_id AS AuditorUserID,
                TRIM(CONCAT(u.FirstName, ' ', u.LastName)) AS AuditorName
            FROM areas ar
            LEFT JOIN auditor_area_assignments aaa ON ar.AreaID = aaa.area_id
            LEFT JOIN users u ON aaa.auditor_user_id = u.UserID
            WHERE ar.EventID = ? AND ar.IsActive = TRUE ${auditorFilter}
            ORDER BY ar.SortOrder ASC, ar.AreaCode ASC
        `, params);

        res.json({
            success: true,
            data: areas
        });
    } catch (error) {
        console.error('Error fetching areas for event:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch areas for event',
            error: error.message
        });
    }
});

// GET area by ID
router.get('/:areaId', auth, async (req, res) => {
    try {
        const { areaId } = req.params;
        const roleId = Number(req.user?.roleId || 0);
        const userId = Number(req.user?.userId || 0);

        if (roleId === 4) {
            const [check] = await db.query(
                'SELECT 1 FROM auditor_area_assignments WHERE area_id = ? AND auditor_user_id = ? LIMIT 1',
                [areaId, userId]
            );
            if (!check || check.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: 'Forbidden: You are not assigned to this area.'
                });
            }
        }

        const [areas] = await db.query(`
            SELECT 
                AreaID,
                AreaCode,
                AreaName,
                EventID,
                Description,
                SortOrder,
                CreatedAt,
                UpdatedAt
            FROM areas
            WHERE AreaID = ? AND IsActive = TRUE
        `, [areaId]);

        if (areas.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Area not found'
            });
        }

        res.json({
            success: true,
            data: areas[0]
        });
    } catch (error) {
        console.error('Error fetching area:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch area',
            error: error.message
        });
    }
});

module.exports = router;
