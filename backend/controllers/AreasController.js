const db = require('../db');

// Add a new area
exports.addArea = async (req, res) => {
    try {
        const { EventChildID, AreaCode, AreaName, Description } = req.body;
        if (!EventChildID || !AreaCode || !AreaName) {
            return res.status(400).json({ success: false, message: 'Event, Area code, and Area name are required.' });
        }
        const [result] = await db.query(
            `INSERT INTO areas (AreaCode, AreaName, EventID, Description, IsActive, CreatedAt, UpdatedAt)
             VALUES (?, ?, ?, ?, 1, NOW(), NOW())`,
            [AreaCode, AreaName, EventChildID, Description || null]
        );
        const [areaRows] = await db.query(
            `SELECT AreaID, AreaCode, AreaName, EventID, Description, SortOrder FROM areas WHERE AreaID = ?`,
            [result.insertId]
        );
        res.json({ success: true, data: areaRows[0] });
    } catch (error) {
        console.error('Error adding area:', error);
        res.status(500).json({ success: false, message: 'Failed to add area', error: error.message });
    }
};

// Soft delete multiple areas
exports.deleteAreas = async (req, res) => {
    try {
        const { areaIds } = req.body;
        if (!Array.isArray(areaIds) || areaIds.length === 0) {
            return res.status(400).json({ success: false, message: 'No area IDs provided' });
        }

        await db.query(
            `UPDATE areas SET IsActive = 0 WHERE AreaID IN (${areaIds.map(() => '?').join(',')})`,
            areaIds
        );

        res.json({ success: true, message: 'Areas deleted successfully' });
    } catch (error) {
        console.error('Error deleting areas:', error);
        res.status(500).json({ success: false, message: 'Failed to delete areas', error: error.message });
    }
};
