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

    // Delete criteria
    const placeholders = criteriaIds.map(() => '?').join(',');
    const [result] = await db.query(
      `DELETE FROM criteria WHERE CriteriaID IN (${placeholders})`,
      criteriaIds
    );

    if (req.user && req.user.userId) {
        try { recordLog(req.user.userId, 'Criteria deleted', { criteriaIds }); } catch (e) {}
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