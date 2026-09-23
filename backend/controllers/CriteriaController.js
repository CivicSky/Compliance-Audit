const db = require('../db');
const { recordLog } = require('./logsController');

// Delete criteria
const deleteCriteria = async (req, res) => {
  try {
    const { criteriaIds } = req.body;

    if (!criteriaIds || !Array.isArray(criteriaIds) || criteriaIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid criteria IDs provided'
      });
    }

    // Clean up requirements under these criteria
    try {
      const placeholders = criteriaIds.map(() => '?').join(',');
      await db.query(`DELETE FROM office_proof_documents WHERE requirement_id IN (SELECT RequirementID FROM requirements WHERE CriteriaID IN (${placeholders}))`, criteriaIds);
      await db.query(`DELETE FROM requirement_user_assignments WHERE RequirementID IN (SELECT RequirementID FROM requirements WHERE CriteriaID IN (${placeholders}))`, criteriaIds);
      await db.query(`DELETE FROM compliancestatusoffices WHERE RequirementID IN (SELECT RequirementID FROM requirements WHERE CriteriaID IN (${placeholders}))`, criteriaIds);
      await db.query(`DELETE FROM requirements WHERE CriteriaID IN (${placeholders})`, criteriaIds);
    } catch (cascadeErr) {
      console.error('Error during cascading requirement cleanup in deleteCriteria:', cascadeErr);
    }

    // Delete criteria
    const placeholders = criteriaIds.map(() => '?').join(',');
    const [result] = await db.query(
      `DELETE FROM criteria WHERE CriteriaID IN (${placeholders})`,
      criteriaIds
    );

    if (req.user && req.user.userId) {
        // Capture criteria details before deletion for verbose logging
        let deletedCriteria = [];
        try {
          const phol = criteriaIds.map(() => '?').join(',');
          const [critRows] = await db.query(
            `SELECT c.CriteriaID, c.CriteriaCode, c.CriteriaName, a.AreaName, e.EventName
             FROM criteria c
             LEFT JOIN areas a ON c.AreaID = a.AreaID
             LEFT JOIN Events e ON c.EventID = e.EventID
             WHERE c.CriteriaID IN (${phol})`,
            criteriaIds
          );
          deletedCriteria = critRows.map(c => ({
            CriteriaCode: c.CriteriaCode,
            CriteriaName: c.CriteriaName,
            AreaName: c.AreaName,
            EventName: c.EventName,
          }));
        } catch (e) { console.warn('Could not fetch criteria details before deletion:', e.message); }
        try { recordLog(req.user.userId, 'CriteriaDeleted', { criteriaIds, deletedCriteria, deletedCount: criteriaIds.length }); } catch (e) {}
    }

    res.json({
      success: true,
      message: `Successfully deleted ${result.affectedRows} criteria(s)` ,
      deletedCount: result.affectedRows
    });
  } catch (error) {
    console.error('Error deleting criteria:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting criteria'
    });
  }
};

// Get all criteria
const getAllCriteria = async (req, res) => {
  try {
    const [criteria] = await db.query(`
      SELECT c.*, e.EventName, e.EventCode, a.AreaID, a.AreaCode, a.AreaName, parent.CriteriaCode AS ParentCriteriaCode
      FROM criteria c
      LEFT JOIN Events e ON c.EventID = e.EventID
      LEFT JOIN areas a ON c.AreaID = a.AreaID
      LEFT JOIN criteria parent ON c.ParentCriteriaID = parent.CriteriaID
      ORDER BY c.CriteriaCode ASC
    `);
    res.json({
      success: true,
      data: criteria
    });
  } catch (error) {
    console.error('Error fetching criteria:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching criteria'
    });
  }
};

// Get criteria by event
const getCriteriaByEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const [criteria] = await db.query(`
      SELECT c.*, e.EventName, e.EventCode, a.AreaID, a.AreaCode, a.AreaName, parent.CriteriaCode AS ParentCriteriaCode
      FROM criteria c
      LEFT JOIN Events e ON c.EventID = e.EventID
      LEFT JOIN areas a ON c.AreaID = a.AreaID
      LEFT JOIN criteria parent ON c.ParentCriteriaID = parent.CriteriaID
      WHERE c.EventID = ?
      ORDER BY c.CriteriaCode ASC
    `, [eventId]);
    res.json({
      success: true,
      data: criteria
    });
  } catch (error) {
    console.error('Error fetching criteria:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching criteria'
    });
  }
};

module.exports = {
  getAllCriteria,
  getCriteriaByEvent,
  deleteCriteria
};