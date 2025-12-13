const express = require('express');
const router = express.Router();
const db = require('../db');
const CriteriaController = require('../controllers/CriteriaController');

// UPDATE criteria by ID
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        let { CriteriaCode, CriteriaName, Description, AreaID, ParentCriteriaID, EventID } = req.body;
        if (!CriteriaCode || !CriteriaName || !Description) {
            return res.status(400).json({
                success: false,
                message: 'Criteria code, name, and description are required.'
            });
        }
        // Ensure AreaID and ParentCriteriaID are null if empty string or 'null' string
        if (AreaID === '' || AreaID === 'null' || AreaID === undefined) AreaID = null;
        if (ParentCriteriaID === '' || ParentCriteriaID === 'null' || ParentCriteriaID === undefined) ParentCriteriaID = null;
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
    } catch (error) {
        console.error('Error updating criteria:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating criteria: ' + (error && error.message ? error.message : String(error))
        });
    }
});

// DELETE criteria (bulk)
router.delete('/delete', CriteriaController.deleteCriteria);

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
router.post('/add', async (req, res) => {
    try {
        const { EventID, AreaID, CriteriaCode, CriteriaName, Description, ParentCriteriaID } = req.body;
        // Validate required fields
        if (!EventID || !CriteriaCode || !CriteriaName || !Description) {
            return res.status(400).json({
                success: false,
                message: 'Event, Criteria Code, Name, and Description are required.'
            });
        }
        // Insert criteria, AreaID and ParentCriteriaID can be null
        const [result] = await db.query(
            `INSERT INTO criteria (EventID, AreaID, CriteriaCode, CriteriaName, Description, ParentCriteriaID, IsActive) VALUES (?, ?, ?, ?, ?, ?, 1)`,
            [EventID, AreaID || null, CriteriaCode, CriteriaName, Description, ParentCriteriaID || null]
        );
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
