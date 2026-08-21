const express = require('express');
const router = express.Router();
const db = require('../db');
const CriteriaController = require('../controllers/CriteriaController');
const { recordLog } = require('../controllers/logsController');
const { auth, restrictAuditor } = require('../middleware/auth');

// GET all criteria
router.get('/', CriteriaController.getAllCriteria);

// GET criteria by event
router.get('/event/:eventId', CriteriaController.getCriteriaByEvent);

// UPDATE criteria by ID
router.put('/:id', auth, restrictAuditor, async (req, res) => {
    try {
        const { id } = req.params;
        let { CriteriaCode, CriteriaName, Description, AreaID, ParentCriteriaID, EventID } = req.body;

        const [existingRows] = await db.query(
            `SELECT c.CriteriaID, c.CriteriaCode, c.CriteriaName, c.Description, c.AreaID, c.ParentCriteriaID, c.EventID, e.EventName
             FROM criteria c
             LEFT JOIN Events e ON c.EventID = e.EventID
             WHERE c.CriteriaID = ?
             LIMIT 1`,
            [id]
        );

        if (existingRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Criteria not found.'
            });
        }

        const existing = existingRows[0];

        // normalize CriteriaCode to uppercase and trim
        if (CriteriaCode !== undefined && CriteriaCode !== null) {
            CriteriaCode = String(CriteriaCode).trim().toUpperCase();
        }
        // Ensure AreaID, ParentCriteriaID, and Description are normalized
        if (AreaID === '' || AreaID === 'null' || AreaID === undefined) AreaID = null;
        if (ParentCriteriaID === '' || ParentCriteriaID === 'null' || ParentCriteriaID === undefined) ParentCriteriaID = null;
        const safeDescription = Description && String(Description).trim() !== '' ? Description : null;

        // Check duplicate code if modified and provided
        if (CriteriaCode && CriteriaCode !== String(existing.CriteriaCode).toUpperCase()) {
            const targetEventId = EventID || existing.EventID;
            const [dup] = await db.query(
                `SELECT CriteriaID FROM criteria WHERE EventID = ? AND LOWER(CriteriaCode) = LOWER(?) AND CriteriaID != ? LIMIT 1`,
                [targetEventId, CriteriaCode, id]
            );
            if (dup.length > 0) {
                return res.status(400).json({ success: false, message: 'A criteria with this code already exists for the selected event.' });
            }
        }

        await db.query(
            `UPDATE criteria
             SET EventID = COALESCE(?, EventID),
                 AreaID = ?,
                 ParentCriteriaID = ?,
                 CriteriaCode = COALESCE(?, CriteriaCode),
                 CriteriaName = COALESCE(?, CriteriaName),
                 Description = ?
             WHERE CriteriaID = ?`,
            [EventID || null, AreaID, ParentCriteriaID, CriteriaCode || null, CriteriaName || null, safeDescription, id]
        );

        const [updatedRows] = await db.query(
            `SELECT c.CriteriaID, c.CriteriaCode, c.CriteriaName, c.Description, c.AreaID, c.ParentCriteriaID, c.EventID, e.EventName
             FROM criteria c
             LEFT JOIN Events e ON c.EventID = e.EventID
             WHERE c.CriteriaID = ?
             LIMIT 1`,
            [id]
        );

        if (req.user && req.user.userId) {
            try {
                recordLog(req.user.userId, 'CriteriaUpdated', {
                    CriteriaID: id,
                    CriteriaCode: CriteriaCode || existing.CriteriaCode,
                    CriteriaName: CriteriaName || existing.CriteriaName,
                    EventID: EventID || existing.EventID,
                    EventName: existing.EventName
                });
            } catch (e) {}
        }

        res.json({
            success: true,
            message: 'Criteria updated successfully',
            data: updatedRows[0]
        });
    } catch (error) {
        console.error('Error updating criteria:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating criteria: ' + (error && error.message ? error.message : String(error))
        });
    }
});

// DELETE criteria (bulk)
router.delete('/delete', auth, restrictAuditor, CriteriaController.deleteCriteria);

// GET criteria by area
router.get('/area/:areaId', async (req, res) => {
    try {
        const { areaId } = req.params;
        
        const [criteria] = await db.query(`
            SELECT 
                CriteriaID,
                CriteriaCode,
                CriteriaName,
                EventID,
                AreaID,
                ParentCriteriaID,
                Description,
                CreatedAt,
                UpdatedAt
            FROM criteria
            WHERE AreaID = ? AND IsActive = TRUE
            ORDER BY CriteriaCode ASC
        `, [areaId]);

        res.json({
            success: true,
            data: criteria
        });
    } catch (error) {
        console.error('Error fetching criteria:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch criteria',
            error: error.message
        });
    }
});

// POST add new criteria (AreaID optional)
router.post('/add', auth, restrictAuditor, async (req, res) => {
    try {
        let { EventID, AreaID, CriteriaCode, CriteriaName, Description, ParentCriteriaID } = req.body;
        if (CriteriaCode !== undefined && CriteriaCode !== null) {
            CriteriaCode = String(CriteriaCode).trim().toUpperCase();
        }
        if (ParentCriteriaID === '' || ParentCriteriaID === 'null' || ParentCriteriaID === undefined) ParentCriteriaID = null;
        if (!EventID || !CriteriaName || (ParentCriteriaID == null && !CriteriaCode)) {
            return res.status(400).json({
                success: false,
                message: ParentCriteriaID == null ? 'Event, Criteria Code, and Name are required.' : 'Event and Criteria Name are required.'
            });
        }
        const safeDescription = Description && String(Description).trim() !== '' ? Description : null;
        if (CriteriaCode) {
            const [existingDup] = await db.query(
                `SELECT CriteriaID FROM criteria WHERE EventID = ? AND LOWER(CriteriaCode) = LOWER(?) LIMIT 1`,
                [EventID, CriteriaCode]
            );
            if (existingDup.length > 0) {
                return res.status(400).json({ success: false, message: 'A criteria with this code already exists for the selected event.' });
            }
        }

        const [result] = await db.query(
            `INSERT INTO criteria (EventID, AreaID, CriteriaCode, CriteriaName, Description, ParentCriteriaID)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [EventID, AreaID || null, CriteriaCode || null, CriteriaName, safeDescription, ParentCriteriaID]
        );

        let eventName = null;
        try {
            const [eventRows] = await db.query(
                'SELECT EventName FROM Events WHERE EventID = ? LIMIT 1',
                [EventID]
            );
            eventName = eventRows[0]?.EventName || null;
        } catch (e) {
            eventName = null;
        }

        res.json({
            success: true,
            message: 'Criteria added successfully',
            data: {
                CriteriaID: result.insertId,
                EventID,
                AreaID: AreaID || null,
                CriteriaCode,
                CriteriaName,
                Description,
                ParentCriteriaID: ParentCriteriaID || null
            }
        });
        if (req.user && req.user.userId) {
            try {
                recordLog(req.user.userId, 'CriteriaAdded', {
                    CriteriaID: result.insertId,
                    CriteriaCode,
                    CriteriaName,
                    EventID,
                    EventName: eventName
                });
            } catch (e) {}
        }
    } catch (error) {
        console.error('Error adding criteria:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding criteria',
            error: error.message
        });
    }
});

module.exports = router;
