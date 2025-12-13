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
