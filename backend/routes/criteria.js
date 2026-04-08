const express = require('express');
const router = express.Router();
const db = require('../db');
const CriteriaController = require('../controllers/CriteriaController');
const { recordLog } = require('../controllers/logsController');
const auth = require('../middleware/auth');

// GET all criteria
router.get('/', CriteriaController.getAllCriteria);

// GET criteria by event
router.get('/event/:eventId', CriteriaController.getCriteriaByEvent);

// UPDATE criteria by ID
router.put('/:id', auth, async (req, res) => {
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
        if (EventID === '' || EventID === 'null' || EventID === undefined) EventID = existing.EventID;
        if (Description === '' || Description === 'null' || Description === undefined) Description = null;

        // Validate required fields: CriteriaName always required; CriteriaCode required only for top-level criteria
        if (!CriteriaName || (ParentCriteriaID == null && !CriteriaCode)) {
            return res.status(400).json({
                success: false,
                message: ParentCriteriaID == null ? 'Criteria code and name are required.' : 'Criteria name is required.'
            });
        }

        // Enforce uniqueness of CriteriaCode within the same Event (case-insensitive) only if CriteriaCode provided
        if (CriteriaCode) {
            const [dupRows] = await db.query(
                `SELECT CriteriaID FROM criteria WHERE EventID = ? AND LOWER(CriteriaCode) = LOWER(?) AND CriteriaID != ? LIMIT 1`,
                [EventID || existing.EventID, CriteriaCode, id]
            );
            if (dupRows.length > 0) {
                return res.status(400).json({ success: false, message: 'A criteria with this code already exists for the selected event.' });
            }
        }

        const [result] = await db.query(
            `UPDATE criteria SET CriteriaCode = ?, CriteriaName = ?, Description = ?, AreaID = ?, ParentCriteriaID = ?, EventID = ? WHERE CriteriaID = ?`,
            [CriteriaCode, CriteriaName, Description, AreaID, ParentCriteriaID, EventID, id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Criteria not found.'
            });
        }
        res.json({
            success: true,
            message: 'Criteria updated successfully.'
        });
                if (req.user && req.user.userId) {
                    const changes = {};
                    const addChange = (field, beforeValue, afterValue) => {
                        const beforeNorm = beforeValue === undefined ? null : beforeValue;
                        const afterNorm = afterValue === undefined ? null : afterValue;
                        if (String(beforeNorm ?? '') !== String(afterNorm ?? '')) {
                            changes[field] = { from: beforeNorm, to: afterNorm };
                        }
                    };

                    addChange('CriteriaCode', existing.CriteriaCode, CriteriaCode);
                    addChange('CriteriaName', existing.CriteriaName, CriteriaName);
                    addChange('Description', existing.Description, Description);
                    addChange('AreaID', existing.AreaID, AreaID);
                    addChange('ParentCriteriaID', existing.ParentCriteriaID, ParentCriteriaID);
                    addChange('EventID', existing.EventID, EventID);

                    let eventName = existing.EventName || null;
                    try {
                        if (EventID && String(existing.EventID ?? '') !== String(EventID)) {
                            const [eventRows] = await db.query('SELECT EventName FROM Events WHERE EventID = ? LIMIT 1', [EventID]);
                            eventName = eventRows[0]?.EventName || eventName;
                        }
                    } catch (e) {
                        // keep existing event name as fallback
                    }

                    try {
                        recordLog(req.user.userId, 'CriteriaUpdated', {
                            CriteriaID: Number(id),
                            CriteriaCode: CriteriaCode || null,
                            CriteriaName: CriteriaName || null,
                            EventID: EventID || null,
                            EventName: eventName,
                            changes
                        });
                    } catch (e) {}
                }
    } catch (error) {
        console.error('Error updating criteria:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating criteria: ' + (error && error.message ? error.message : String(error))
        });
    }
});

// DELETE criteria (bulk)
router.delete('/delete', auth, CriteriaController.deleteCriteria);

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
                Description
            FROM criteria
            WHERE AreaID = ? AND IsActive = 1
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
router.post('/add', auth, async (req, res) => {
    try {
        let { EventID, AreaID, CriteriaCode, CriteriaName, Description, ParentCriteriaID } = req.body;
        // normalize CriteriaCode to uppercase and trim
        if (CriteriaCode !== undefined && CriteriaCode !== null) {
            CriteriaCode = String(CriteriaCode).trim().toUpperCase();
        }
        // Normalize ParentCriteriaID
        if (ParentCriteriaID === '' || ParentCriteriaID === 'null' || ParentCriteriaID === undefined) ParentCriteriaID = null;
        // Validate required fields: EventID and CriteriaName required; CriteriaCode required only if no ParentCriteriaID
        if (!EventID || !CriteriaName || (ParentCriteriaID == null && !CriteriaCode)) {
            return res.status(400).json({
                success: false,
                message: ParentCriteriaID == null ? 'Event, Criteria Code, and Name are required.' : 'Event and Criteria Name are required.'
            });
        }
        // Insert criteria, AreaID, ParentCriteriaID, and Description can be null
        const safeDescription = Description && String(Description).trim() !== '' ? Description : null;
        // Enforce uniqueness of CriteriaCode within the same Event (case-insensitive) only if CriteriaCode provided
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
            `INSERT INTO criteria (EventID, AreaID, CriteriaCode, CriteriaName, Description, ParentCriteriaID, IsActive) VALUES (?, ?, ?, ?, ?, ?, 1)`,
            [EventID, AreaID || null, CriteriaCode, CriteriaName, safeDescription, ParentCriteriaID || null]
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
