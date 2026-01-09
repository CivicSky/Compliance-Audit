const db = require('../db');

// Get all criteria
const getAllCriteria = async (req, res) => {
  try {
    const [criteria] = await db.query(`
      SELECT c.*, e.EventName, e.EventCode, a.AreaID, a.AreaCode, a.AreaName, a.SortOrder
      FROM criteria c
      LEFT JOIN Events e ON c.EventID = e.EventID
      LEFT JOIN areas a ON c.AreaID = a.AreaID
      ORDER BY a.SortOrder ASC, c.CriteriaCode ASC
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
      SELECT c.*, e.EventName, e.EventCode, a.AreaID, a.AreaCode, a.AreaName, a.SortOrder
      FROM criteria c
      LEFT JOIN Events e ON c.EventID = e.EventID
      LEFT JOIN areas a ON c.AreaID = a.AreaID
      WHERE c.EventID = ?
      ORDER BY a.SortOrder ASC, c.CriteriaCode ASC
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

// ========================
// REQUIREMENT USER ASSIGNMENTS
// ========================

// Assign users to a requirement (max 4 users per requirement)
const assignUsersToRequirement = async (req, res) => {
  try {
    const { requirementId, officeId, userIds, assignedBy } = req.body;

    if (!requirementId || !userIds || !Array.isArray(userIds)) {
      return res.status(400).json({
        success: false,
        message: 'RequirementID and userIds array are required'
      });
    }

    if (userIds.length > 4) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 4 users can be assigned to a requirement'
      });
    }

    // Check how many users are already assigned to this requirement in this office
    const existingQuery = 'SELECT COUNT(*) as count FROM requirement_user_assignments WHERE RequirementID = ? AND OfficeID = ?';
    const existingParams = [requirementId, officeId];

    const [existingCount] = await db.query(existingQuery, existingParams);

    // Calculate how many more can be added
    const currentCount = existingCount[0].count;
    const remainingSlots = 4 - currentCount;

    if (remainingSlots <= 0) {
      return res.status(400).json({
        success: false,
        message: 'This requirement already has 4 users assigned in this office (maximum reached)'
      });
    }

    if (userIds.length > remainingSlots) {
      return res.status(400).json({
        success: false,
        message: `Only ${remainingSlots} more user(s) can be assigned to this requirement in this office`
      });
    }

    // Check which users are already assigned (unique constraint is on RequirementID + OfficeID + UserID)
    const checkQuery = 'SELECT UserID FROM requirement_user_assignments WHERE RequirementID = ? AND OfficeID = ? AND UserID IN (?)';
    const checkParams = [requirementId, officeId, userIds];

    const [alreadyAssigned] = await db.query(checkQuery, checkParams);
    const alreadyAssignedIds = alreadyAssigned.map(a => a.UserID);

    // Filter out already assigned users
    const newUserIds = userIds.filter(id => !alreadyAssignedIds.includes(id));

    if (newUserIds.length === 0) {
      return res.json({
        success: true,
        message: 'All selected users are already assigned to this requirement in this office',
        data: []
      });
    }

    // Insert new assignments
    const insertValues = newUserIds.map(userId => [requirementId, officeId || null, userId, assignedBy || null]);

    await db.query(
      'INSERT INTO requirement_user_assignments (RequirementID, OfficeID, UserID, AssignedBy) VALUES ?',
      [insertValues]
    );

    res.json({
      success: true,
      message: `Successfully assigned ${newUserIds.length} user(s) to the requirement in this office`,
      data: { assignedUserIds: newUserIds }
    });
  } catch (error) {
    console.error('Error assigning users to requirement:', error);
    res.status(500).json({
      success: false,
      message: 'Error assigning users to requirement'
    });
  }
};

// Get users assigned to a requirement
const getAssignedUsers = async (req, res) => {
  try {
    const { requirementId } = req.params;
    const { officeId } = req.query;

    let query = `
      SELECT 
        rua.AssignmentID,
        rua.RequirementID,
        rua.OfficeID,
        rua.UserID,
        rua.AssignedAt,
        rua.AssignedBy,
        rua.HasUploaded,
        u.FirstName,
        u.MiddleInitial,
        u.LastName,
        u.Email,
        u.ProfilePic
      FROM requirement_user_assignments rua
      JOIN users u ON rua.UserID = u.UserID
      WHERE rua.RequirementID = ?
    `;
    const params = [requirementId];
    if (officeId) {
      query += ' AND rua.OfficeID = ?';
      params.push(officeId);
    }
    query += ' ORDER BY rua.AssignedAt DESC';

    const [assignments] = await db.query(query, params);

    res.json({
      success: true,
      data: assignments
    });
  } catch (error) {
    console.error('Error fetching assigned users:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching assigned users'
    });
  }
};

// Remove user assignment from a requirement
const removeUserAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;

    const [result] = await db.query(
      'DELETE FROM requirement_user_assignments WHERE AssignmentID = ?',
      [assignmentId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    res.json({
      success: true,
      message: 'User assignment removed successfully'
    });
  } catch (error) {
    console.error('Error removing user assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing user assignment'
    });
  }
};

// Get all requirements a user is assigned to (with count check - max 4)
const getUserAssignmentCount = async (req, res) => {
  try {
    const { userId } = req.params;

    const [result] = await db.query(
      'SELECT COUNT(*) as count FROM requirement_user_assignments WHERE UserID = ?',
      [userId]
    );

    res.json({
      success: true,
      data: {
        userId,
        assignmentCount: result[0].count,
        canAssignMore: result[0].count < 4,
        remainingSlots: Math.max(0, 4 - result[0].count)
      }
    });
  } catch (error) {
    console.error('Error getting user assignment count:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting user assignment count'
    });
  }
};

// Get available users for assignment (all approved users with RoleID = 2)
const getAvailableUsersForAssignment = async (req, res) => {
  try {
    const { requirementId, officeId } = req.query;

    // Get all approved users with RoleID = 2
    const [users] = await db.query(`
      SELECT 
        u.UserID,
        u.FirstName,
        u.MiddleInitial,
        u.LastName,
        u.Email,
        u.ProfilePic
      FROM users u
      WHERE u.RoleID = 2 AND u.approval_status = 'approved'
      ORDER BY u.FirstName, u.LastName
    `);

    // If requirementId is provided, also check which users are already assigned to it
    if (requirementId) {
      let assignedQuery = 'SELECT UserID FROM requirement_user_assignments WHERE RequirementID = ?';
      const assignedParams = [requirementId];
      
      if (officeId) {
        assignedQuery += ' AND OfficeID = ?';
        assignedParams.push(officeId);
      }
      
      const [alreadyAssigned] = await db.query(assignedQuery, assignedParams);
      const assignedUserIds = alreadyAssigned.map(a => a.UserID);
      
      // Mark users that are already assigned to this requirement
      const usersWithStatus = users.map(user => ({
        ...user,
        isAssigned: assignedUserIds.includes(user.UserID)
      }));
      
      return res.json({
        success: true,
        data: usersWithStatus
      });
    }

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Error fetching available users:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching available users'
    });
  }
};

// Update user's upload status for a requirement
const updateUserUploadStatus = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { hasUploaded } = req.body;

    const [result] = await db.query(
      'UPDATE requirement_user_assignments SET HasUploaded = ? WHERE AssignmentID = ?',
      [hasUploaded ? 1 : 0, assignmentId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    res.json({
      success: true,
      message: `Upload status updated to ${hasUploaded ? 'uploaded' : 'not uploaded'}`
    });
  } catch (error) {
    console.error('Error updating upload status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating upload status'
    });
  }
};

// Mark user as uploaded by requirementId and userId
const markUserAsUploaded = async (req, res) => {
  try {
    const { requirementId, userId } = req.body;

    if (!requirementId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'RequirementID and UserID are required'
      });
    }

    const [result] = await db.query(
      'UPDATE requirement_user_assignments SET HasUploaded = 1 WHERE RequirementID = ? AND UserID = ?',
      [requirementId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found for this user and requirement'
      });
    }

    res.json({
      success: true,
      message: 'User marked as uploaded successfully'
    });
  } catch (error) {
    console.error('Error marking user as uploaded:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking user as uploaded'
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
  getAllEvents,
  addEvent,
  deleteEvents,
  updateEvent,
  // User assignment functions
  assignUsersToRequirement,
  getAssignedUsers,
  removeUserAssignment,
  getUserAssignmentCount,
  getAvailableUsersForAssignment,
  updateUserUploadStatus,
  markUserAsUploaded
};