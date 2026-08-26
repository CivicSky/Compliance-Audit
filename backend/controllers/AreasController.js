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
                 VALUES (?, ?, ?, ?, TRUE, NOW(), NOW())`,
                [AreaCode, AreaName, eventId, Description || null]
            );
        } catch (insertErr) {
            // Fallback query for schemas without CreatedAt/UpdatedAt columns
            [result] = await db.query(
                `INSERT INTO areas (AreaCode, AreaName, EventID, Description, IsActive)
                 VALUES (?, ?, ?, ?, TRUE)`,
                [AreaCode, AreaName, eventId, Description || null]
            );
        }

        const [areaRows] = await db.query(
            `SELECT AreaID, AreaCode, AreaName, EventID, Description, SortOrder, CreatedAt, UpdatedAt FROM areas WHERE AreaID = ?`,
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

        const placeholders = areaIds.map(() => '?').join(',');

        // Clean up requirements & criteria under these areas
        try {
          const [critRows] = await db.query(`SELECT CriteriaID FROM criteria WHERE AreaID IN (${placeholders})`, areaIds);
          if (critRows && critRows.length > 0) {
            const critIds = critRows.map(c => c.CriteriaID ?? c.criteriaid).filter(Boolean);
            if (critIds.length > 0) {
              const critPlaceholders = critIds.map(() => '?').join(',');
              await db.query(`DELETE FROM office_proof_documents WHERE requirement_id IN (SELECT RequirementID FROM requirements WHERE CriteriaID IN (${critPlaceholders}))`, critIds);
              await db.query(`DELETE FROM requirement_user_assignments WHERE RequirementID IN (SELECT RequirementID FROM requirements WHERE CriteriaID IN (${critPlaceholders}))`, critIds);
              await db.query(`DELETE FROM compliancestatusoffices WHERE RequirementID IN (SELECT RequirementID FROM requirements WHERE CriteriaID IN (${critPlaceholders}))`, critIds);
              await db.query(`DELETE FROM requirements WHERE CriteriaID IN (${critPlaceholders})`, critIds);
              await db.query(`DELETE FROM criteria WHERE CriteriaID IN (${critPlaceholders})`, critIds);
            }
          }
        } catch (cascadeErr) {
          console.error('Error during cascading cleanup in deleteAreas:', cascadeErr);
        }

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
