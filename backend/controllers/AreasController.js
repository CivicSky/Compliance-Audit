const db = require('../db');
const { recordLog } = require('./logsController');

// Add a new area
exports.addArea = async (req, res) => {
    try {
        const { EventChildID, EventID, AreaCode, AreaName, Description } = req.body;
        const eventId = EventChildID || EventID;

        if (!eventId || !AreaCode || !AreaName) {
            return res.status(400).json({ success: false, message: 'Event, Area code, and Area name are required.' });
        }

        let result;
        try {
            // Preferred query for schemas with CreatedAt/UpdatedAt columns
            [result] = await db.query(
                `INSERT INTO areas (AreaCode, AreaName, EventID, Description, IsActive, CreatedAt, UpdatedAt)
                 VALUES (?, ?, ?, ?, 1, NOW(), NOW())`,
                [AreaCode, AreaName, eventId, Description || null]
            );
        } catch (insertErr) {
            // Fallback query for schemas without CreatedAt/UpdatedAt columns
            [result] = await db.query(
                `INSERT INTO areas (AreaCode, AreaName, EventID, Description, IsActive)
                 VALUES (?, ?, ?, ?, 1)`,
                [AreaCode, AreaName, eventId, Description || null]
            );
        }

        const [areaRows] = await db.query(
            `SELECT AreaID, AreaCode, AreaName, EventID, Description, SortOrder FROM areas WHERE AreaID = ?`,
            [result.insertId]
        );
        res.json({ success: true, data: areaRows[0] });
                if (req.user && req.user.userId) {
                    try { recordLog(req.user.userId, 'AreaAdded', { AreaID: areaRows[0].AreaID, AreaName: areaRows[0].AreaName, EventID: areaRows[0].EventID }); } catch (e) {}
                }
    } catch (error) {
        console.error('Error adding area:', error);
        if (error && error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: 'Area code already exists.' });
        }
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

        // Perform a hard delete so frontend deletions remove rows from the DB
        const placeholders = areaIds.map(() => '?').join(',');
        const [result] = await db.query(
            `DELETE FROM areas WHERE AreaID IN (${placeholders})`,
            areaIds
        );

                if (req.user && req.user.userId) {
                    try { recordLog(req.user.userId, 'AreaDeleted', { areaIds }); } catch (e) {}
                }
        return res.json({
            success: true,
            message: `Successfully deleted ${result.affectedRows} area(s)`,
            deletedCount: result.affectedRows
        });
    } catch (error) {
        console.error('Error deleting areas:', error);
        res.status(500).json({ success: false, message: 'Failed to delete areas', error: error.message });
    }
};
