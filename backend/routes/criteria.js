const express = require('express');
const router = express.Router();
const db = require('../db');

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

module.exports = router;
