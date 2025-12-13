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
const db = require('../db');

// Get all criteria
const getAllCriteria = async (req, res) => {
  try {
    const [criteria] = await db.query(`
      SELECT c.*, e.EventName, e.EventCode 
      FROM criteria c
      LEFT JOIN Events e ON c.EventID = e.EventID
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
      SELECT c.*, e.EventName, e.EventCode 
      FROM criteria c
      LEFT JOIN Events e ON c.EventID = e.EventID
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

// Get all requirements
const getAllRequirements = async (req, res) => {
  try {
    const { eventId } = req.query;
    
    let query = `
      SELECT 
        r.*, 
        c.CriteriaName, 
        c.CriteriaCode,
        c.AreaID,
        a.AreaCode,
        a.AreaName,
        a.SortOrder AS AreaSortOrder,
        e.EventID,
        e.EventName,
        e.EventCode
      FROM requirements r
      LEFT JOIN criteria c ON r.CriteriaID = c.CriteriaID
      LEFT JOIN areas a ON c.AreaID = a.AreaID
      LEFT JOIN Events e ON c.EventID = e.EventID
    `;
    
    const params = [];
    
    // Filter by event if eventId is provided
    if (eventId) {
      query += ` WHERE e.EventID = ?`;
      params.push(eventId);
    }
    
    query += ` ORDER BY a.SortOrder ASC, c.CriteriaCode ASC, r.RequirementCode ASC`;
    
    const [requirements] = await db.query(query, params);
    res.json({
      success: true,
      data: requirements
    });
  } catch (error) {
    console.error('Error fetching requirements:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching requirements'
    });
  }
};

// Add new requirement
const addRequirement = async (req, res) => {
  try {
    let { RequirementCode, Description, CriteriaID, ParentRequirementCode } = req.body;

    // Validate required fields
    if (!Description || !CriteriaID) {
      return res.status(400).json({
        success: false,
        message: 'Description and criteria are required'
      });
    }

    // Auto-generate RequirementCode if parent is selected
    if (ParentRequirementCode) {
      if (!RequirementCode || RequirementCode.trim() === '') {
        // No code provided - auto-generate next number
        const [children] = await db.query(
          'SELECT RequirementCode FROM requirements WHERE ParentRequirementCode = ? ORDER BY RequirementCode DESC LIMIT 1',
          [ParentRequirementCode]
        );

        if (children.length > 0) {
          const lastChild = children[0].RequirementCode;
          const parts = lastChild.split('.');
          const lastNumber = parseInt(parts[parts.length - 1]) || 0;
          RequirementCode = `${ParentRequirementCode}.${lastNumber + 1}`;
        } else {
          RequirementCode = `${ParentRequirementCode}.1`;
        }
      } else if (!/\./.test(RequirementCode)) {
        // Code provided but it's just a number (no dot) - append to parent
        RequirementCode = `${ParentRequirementCode}.${RequirementCode}`;
      }
      // If RequirementCode already has dots, use it as-is
    } else {
      // No parent requirement - join with criteria code
      if (!RequirementCode || RequirementCode.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Requirement code is required'
        });
      }

      // Get the criteria code to join with
      const [criteria] = await db.query(
        'SELECT CriteriaCode FROM criteria WHERE CriteriaID = ?',
        [CriteriaID]
      );

      if (criteria.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid criteria selected'
        });
      }

      const criteriaCode = criteria[0].CriteriaCode;

      // If user enters just a number, join with criteria code
      if (!/\./.test(RequirementCode)) {
        RequirementCode = `${criteriaCode}.${RequirementCode}`;
      }
      // If RequirementCode already has dots, use it as-is
    }

    // Insert new requirement
    const [result] = await db.query(
      'INSERT INTO requirements (RequirementCode, Description, CriteriaID, ParentRequirementCode) VALUES (?, ?, ?, ?)',
      [RequirementCode, Description, CriteriaID, ParentRequirementCode || null]
    );

    res.json({
      success: true,
      message: 'Requirement added successfully',
      data: {
        RequirementID: result.insertId,
        RequirementCode,
        Description,
        CriteriaID,
        ParentRequirementCode
      }
    });
  } catch (error) {
    console.error('Error adding requirement:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding requirement'
    });
  }
};

// Get requirements by event (through criteria)
const getRequirementsByEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const [requirements] = await db.query(`
      SELECT 
        r.*, 
        c.CriteriaName, 
        c.CriteriaCode,
        e.EventName,
        e.EventCode
      FROM requirements r
      LEFT JOIN criteria c ON r.CriteriaID = c.CriteriaID
      LEFT JOIN Events e ON c.EventID = e.EventID
      WHERE c.EventID = ?
      ORDER BY r.RequirementCode ASC
    `, [eventId]);
    
    res.json({
      success: true,
      data: requirements
    });
  } catch (error) {
    console.error('Error fetching requirements:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching requirements'
    });
  }
};

// Get all events
const getAllEvents = async (req, res) => {
  try {
    const [events] = await db.query('SELECT * FROM Events ORDER BY CreatedAt DESC');
    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching events'
    });
  }
};

// Add new event
const addEvent = async (req, res) => {
  try {
    const { EventName, EventCode, Description } = req.body;

    // Validate required fields
    if (!EventName || !EventCode) {
      return res.status(400).json({
        success: false,
        message: 'Event name and code are required'
      });
    }

    // Insert new event
    const [result] = await db.query(
      'INSERT INTO Events (EventName, EventCode, Description, CreatedAt) VALUES (?, ?, ?, NOW())',
      [EventName, EventCode, Description || null]
    );

    res.json({
      success: true,
      message: 'Event added successfully',
      data: {
        EventID: result.insertId,
        EventName,
        EventCode,
        Description
      }
    });
  } catch (error) {
    console.error('Error adding event:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding event'
    });
  }
};

// Delete multiple events
const deleteEvents = async (req, res) => {
  try {
    const { eventIds } = req.body;

    if (!eventIds || !Array.isArray(eventIds) || eventIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Event IDs are required'
      });
    }

    // Delete events
    const placeholders = eventIds.map(() => '?').join(',');
    const [result] = await db.query(
      `DELETE FROM Events WHERE EventID IN (${placeholders})`,
      eventIds
    );

    res.json({
      success: true,
      message: `${result.affectedRows} event(s) deleted successfully`,
      deletedCount: result.affectedRows
    });
  } catch (error) {
    console.error('Error deleting events:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting events'
    });
  }
};

// Update event
const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { EventName, EventCode, Description } = req.body;

    // Validate required fields
    if (!EventName || !EventCode) {
      return res.status(400).json({
        success: false,
        message: 'Event name and code are required'
      });
    }

    // Update event
    const [result] = await db.query(
      'UPDATE Events SET EventName = ?, EventCode = ?, Description = ? WHERE EventID = ?',
      [EventName, EventCode, Description || null, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.json({
      success: true,
      message: 'Event updated successfully',
      data: {
        EventID: parseInt(id),
        EventName,
        EventCode,
        Description
      }
    });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating event'
    });
  }
};

// Update requirement
const updateRequirement = async (req, res) => {
  try {
    const { id } = req.params;
    let { RequirementCode, Description, CriteriaID, ParentRequirementCode } = req.body;

    // Validate required fields
    if (!Description || !CriteriaID) {
      return res.status(400).json({
        success: false,
        message: 'Description and criteria are required'
      });
    }

    // Auto-generate RequirementCode if parent is selected (same logic as add)
    if (ParentRequirementCode) {
      if (!RequirementCode || RequirementCode.trim() === '') {
        // No code provided - auto-generate next number
        const [children] = await db.query(
          'SELECT RequirementCode FROM requirements WHERE ParentRequirementCode = ? ORDER BY RequirementCode DESC LIMIT 1',
          [ParentRequirementCode]
        );

        if (children.length > 0) {
          const lastChild = children[0].RequirementCode;
          const parts = lastChild.split('.');
          const lastNumber = parseInt(parts[parts.length - 1]) || 0;
          RequirementCode = `${ParentRequirementCode}.${lastNumber + 1}`;
        } else {
          RequirementCode = `${ParentRequirementCode}.1`;
        }
      } else if (!/\./.test(RequirementCode)) {
        // Code provided but it's just a number (no dot) - append to parent
        RequirementCode = `${ParentRequirementCode}.${RequirementCode}`;
      }
      // If RequirementCode already has dots, use it as-is
    } else {
      // No parent requirement - join with criteria code
      if (!RequirementCode || RequirementCode.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Requirement code is required'
        });
      }

      // Get the criteria code to join with
      const [criteria] = await db.query(
        'SELECT CriteriaCode FROM criteria WHERE CriteriaID = ?',
        [CriteriaID]
      );

      if (criteria.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid criteria selected'
        });
      }

      const criteriaCode = criteria[0].CriteriaCode;

      // If user enters just a number, join with criteria code
      if (!/\./.test(RequirementCode)) {
        RequirementCode = `${criteriaCode}.${RequirementCode}`;
      }
      // If RequirementCode already has dots, use it as-is
    }

    // Update requirement
    const [result] = await db.query(
      'UPDATE requirements SET RequirementCode = ?, Description = ?, CriteriaID = ?, ParentRequirementCode = ? WHERE RequirementID = ?',
      [RequirementCode, Description, CriteriaID, ParentRequirementCode || null, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Requirement not found'
      });
    }

    res.json({
      success: true,
      message: 'Requirement updated successfully',
      data: {
        RequirementID: parseInt(id),
        RequirementCode,
        Description,
        CriteriaID,
        ParentRequirementCode
      }
    });
  } catch (error) {
    console.error('Error updating requirement:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating requirement'
    });
  }
};

// Delete requirements
const deleteRequirements = async (req, res) => {
  try {
    const { requirementIds } = req.body;

    if (!requirementIds || !Array.isArray(requirementIds) || requirementIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid requirement IDs provided'
      });
    }

    // Delete requirements
    const placeholders = requirementIds.map(() => '?').join(',');
    const [result] = await db.query(
      `DELETE FROM requirements WHERE RequirementID IN (${placeholders})`,
      requirementIds
    );

    res.json({
      success: true,
      message: `Successfully deleted ${result.affectedRows} requirement(s)`,
      deletedCount: result.affectedRows
    });
  } catch (error) {
    console.error('Error deleting requirements:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting requirements'
    });
  }
};

module.exports = {
  getAllCriteria,
  getCriteriaByEvent,
  getAllRequirements,
  getRequirementsByEvent,
  addRequirement,
  updateRequirement,
  deleteRequirements,
  deleteCriteria,
  getAllEvents,
  addEvent,
  deleteEvents,
  updateEvent
};