
const express = require('express');
const router = express.Router();
const db = require('../db');
const { recordLog } = require('../controllers/logsController');
const AreasController = require('../controllers/AreasController');
const auth = require('../middleware/auth');

// POST add area
router.post('/add', auth, AreasController.addArea);

// DELETE multiple areas
router.post('/delete', auth, AreasController.deleteAreas);

// UPDATE area
router.put('/:areaId', auth, async (req, res) => {
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
                 WHERE AreaID = ? AND IsActive = 1`,
                [AreaCode, AreaName, Description || null, areaId]
            );
        } catch (updateErr) {
            // Fallback for schemas without UpdatedAt column
            [result] = await db.query(
                `UPDATE areas
                 SET AreaCode = ?, AreaName = ?, Description = ?
                 WHERE AreaID = ? AND IsActive = 1`,
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
            `SELECT AreaID, AreaCode, AreaName, EventID, Description, SortOrder
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
                SortOrder
            FROM areas
            WHERE IsActive = 1
            ORDER BY SortOrder ASC
        `);
        res.json({
            success: true,
            data: areas
        });
    } catch (error) {
        console.error('Error fetching all areas:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch all areas',
            error: error.message
        });
    }
});

// GET areas by event
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
                SortOrder
            FROM areas
            WHERE EventID = ? AND IsActive = 1
            ORDER BY SortOrder ASC
        `, [eventId]);

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

module.exports = router;
