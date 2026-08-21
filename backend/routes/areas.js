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
router.get('/assignments/:userId', async (req, res) => {
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
        res.json({ success: true, assignments: rows });
    } catch (err) {
        console.error('Error fetching auditor assignments:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch assignments', error: err.message });
    }
});

// GET auditors assigned to an office (via area assignments)
router.get('/auditors/office/:officeId', async (req, res) => {
    try {
        await ensureAssignmentsTable();
        const { officeId } = req.params;
        const [rows] = await db.query(
            `SELECT DISTINCT u.UserID, u.FirstName, u.LastName, u.Email, u.ProfilePic, ar.AreaCode, ar.AreaName
             FROM auditor_area_assignments aaa
             JOIN users u ON aaa.auditor_user_id = u.UserID
             JOIN areas ar ON aaa.area_id = ar.AreaID
             JOIN offices o ON o.EventID = ar.EventID
             WHERE o.OfficeID = ?`,
            [officeId]
        );
        res.json({ success: true, auditors: rows });
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

        // Insert new area assignments
        if (areaIds.length > 0) {
            for (const areaId of areaIds) {
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
                recordLog(req.user.userId, 'AuditorAssignedAreas', {
                    AuditorUserID: userId,
                    AssignedAreaCount: areaIds.length,
                    Areas: assignedAreas
                });
            } catch (e) {}
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
router.get('/', async (req, res) => {
    try {
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
            WHERE IsActive = TRUE
            ORDER BY SortOrder ASC
        `);
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
router.get('/event/:eventId', async (req, res) => {
    try {
        const { eventId } = req.params;
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
            WHERE EventID = ? AND IsActive = TRUE
            ORDER BY SortOrder ASC, AreaCode ASC
        `, [eventId]);

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
router.get('/:areaId', async (req, res) => {
    try {
        const { areaId } = req.params;
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
