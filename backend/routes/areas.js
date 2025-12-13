
const express = require('express');
const router = express.Router();
const db = require('../db');
const AreasController = require('../controllers/AreasController');

// POST add area
router.post('/add', AreasController.addArea);

// DELETE multiple areas
router.post('/delete', async (req, res) => {
    try {
        const { areaIds } = req.body;
        if (!Array.isArray(areaIds) || areaIds.length === 0) {
            return res.status(400).json({ success: false, message: 'No area IDs provided' });
        }
        // Soft delete: set IsActive = 0
        await db.query(
            `UPDATE areas SET IsActive = 0 WHERE AreaID IN (${areaIds.map(() => '?').join(',')})`,
            areaIds
        );
        res.json({ success: true, message: 'Areas deleted successfully' });
    } catch (error) {
        console.error('Error deleting areas:', error);
        res.status(500).json({ success: false, message: 'Failed to delete areas', error: error.message });
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
