const db = require('../db');
const { recordLog } = require('./logsController');
const { createNotifications } = require('../utils/notificationService');
const fs = require('fs');
const path = require('path');

const isUnknownColumnError = (error) =>
  error?.code === 'ER_BAD_FIELD_ERROR' || error?.errno === 1054;

const executeWithFallbacks = async (attempts) => {
  let lastError;
  for (const attempt of attempts) {
    try {
      return await db.query(attempt.sql, attempt.params);
    } catch (error) {
      lastError = error;
      if (!isUnknownColumnError(error)) {
        throw error;
      }
    }
  }
  throw lastError;
};

const resolveParentRequirement = async (parentValue) => {
  if (!parentValue) {
    return { parentCode: null, parentId: null };
  }

  const raw = String(parentValue).trim();
  if (!raw) {
    return { parentCode: null, parentId: null };
  }

  // Accept either parent code or parent requirement ID for compatibility.
  if (/^\d+$/.test(raw)) {
    const parentId = Number(raw);
    const [rows] = await db.query(
      'SELECT RequirementID, RequirementCode FROM requirements WHERE RequirementID = ? LIMIT 1',
      [parentId]
    );
    if (rows.length === 0) {
      throw new Error('Selected parent requirement was not found');
    }
    return { parentCode: rows[0].RequirementCode, parentId: rows[0].RequirementID };
  }

  const [rows] = await db.query(
    'SELECT RequirementID, RequirementCode FROM requirements WHERE RequirementCode = ? LIMIT 1',
    [raw]
  );
  if (rows.length === 0) {
    throw new Error('Selected parent requirement was not found');
  }

  return { parentCode: rows[0].RequirementCode, parentId: rows[0].RequirementID };
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
    let { RequirementCode, Description, CriteriaID, ParentRequirementCode, ParentRequirementID } = req.body;

    // Validate required fields
    if (!Description || !CriteriaID) {
      return res.status(400).json({
        success: false,
        message: 'Description and criteria are required'
      });
    }

    CriteriaID = Number(CriteriaID);
    if (!Number.isInteger(CriteriaID) || CriteriaID <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid criteria selected'
      });
    }

    const [criteria] = await db.query(
      `SELECT c.CriteriaCode, c.CriteriaName, c.EventID, e.EventName
       FROM criteria c
       LEFT JOIN Events e ON c.EventID = e.EventID
       WHERE c.CriteriaID = ?
       LIMIT 1`,
      [CriteriaID]
    );

    if (criteria.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid criteria selected'
      });
    }

    const criteriaRow = criteria[0];
    const criteriaCode = criteriaRow.CriteriaCode;
    const { parentCode, parentId } = await resolveParentRequirement(ParentRequirementCode || ParentRequirementID);

    // Server-side generation with retry-on-duplicate to reduce race conditions.
    const maxAttempts = 6;
    let inserted = null;

    // Use db directly as postgres manages connection pooling automatically
    const conn = db;
    try {
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        let candidateCode = RequirementCode && String(RequirementCode).trim();

        if (parentCode) {
          // If no code provided or user provided a plain number, build from parent
          if (!candidateCode) {
            const [children] = await conn.query(
              'SELECT RequirementCode FROM requirements WHERE CriteriaID = ? AND RequirementCode LIKE ? ORDER BY LENGTH(RequirementCode) DESC, RequirementCode DESC LIMIT 1',
              [CriteriaID, `${parentCode}.%`]
            );
            if (children.length > 0) {
              const lastChild = children[0].RequirementCode;
              const parts = lastChild.split('.');
              const lastNumber = parseInt(parts[parts.length - 1]) || 0;
              candidateCode = `${parentCode}.${lastNumber + 1}`;
            } else {
              candidateCode = `${parentCode}.1`;
            }
          } else if (!/\./.test(candidateCode)) {
            candidateCode = `${parentCode}.${candidateCode}`;
          }
        } else {
          // top-level under criteria
          if (!candidateCode) {
            // compute next under criteriaCode
            const [siblings] = await conn.query(
              'SELECT RequirementCode FROM requirements WHERE CriteriaID = ? AND RequirementCode LIKE ? ORDER BY LENGTH(RequirementCode) DESC, RequirementCode DESC LIMIT 1',
              [CriteriaID, `${criteriaCode}.%`]
            );
            if (siblings.length > 0) {
              const last = siblings[0].RequirementCode;
              const parts = last.split('.');
              const lastNumber = parseInt(parts[parts.length - 1]) || 0;
              candidateCode = `${criteriaCode}.${lastNumber + 1}`;
            } else {
              candidateCode = `${criteriaCode}.1`;
            }
          } else if (!/\./.test(candidateCode)) {
            candidateCode = `${criteriaCode}.${candidateCode}`;
          }
        }

        // Try insert
        try {
          // Try multiple INSERT variants to support older schemas that may
          // not have the ParentRequirementID column. If the DB throws an
          // unknown-column error, fall back to the next variant.
          const insertAttempts = [
            {
              sql: 'INSERT INTO requirements (RequirementCode, Description, CriteriaID, ParentRequirementCode, ParentRequirementID, CreatedAt, UpdatedAt) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
              params: [candidateCode, Description, CriteriaID, parentCode || null, parentId || null]
            },
            {
              sql: 'INSERT INTO requirements (RequirementCode, Description, CriteriaID, ParentRequirementCode, CreatedAt, UpdatedAt) VALUES (?, ?, ?, ?, NOW(), NOW())',
              params: [candidateCode, Description, CriteriaID, parentCode || null]
            },
            {
              sql: 'INSERT INTO requirements (RequirementCode, Description, CriteriaID, CreatedAt, UpdatedAt) VALUES (?, ?, ?, NOW(), NOW())',
              params: [candidateCode, Description, CriteriaID]
            }
          ];

          let insertResult = null;
          for (const attemptSql of insertAttempts) {
            try {
              const [result] = await conn.query(attemptSql.sql, attemptSql.params);
              insertResult = result;
              break;
            } catch (err) {
              // If the DB doesn't have the column, try the next variant
              if (isUnknownColumnError(err)) {
                continue;
              }
              // If duplicate key, let outer loop handle retry
              if (err && err.code === 'ER_DUP_ENTRY') {
                throw err; // will be handled by outer catch and retry
              }
              throw err;
            }
          }

          if (!insertResult) {
            // All insert attempts failed due to missing columns; throw a descriptive error
            throw new Error('Failed to insert requirement: incompatible database schema (missing columns)');
          }

          inserted = {
            RequirementID: insertResult.insertId,
            RequirementCode: candidateCode,
            Description,
            CriteriaID,
            ParentRequirementCode: parentCode,
            ParentRequirementID: parentId
          };
          break;
        } catch (err) {
          // If duplicate key, retry (recompute next code)
          if (err && err.code === 'ER_DUP_ENTRY') {
            // continue to retry
            if (attempt === maxAttempts - 1) {
              throw err;
            }
            // small loop to retry
            continue;
          }
          throw err;
        }
      }
    } finally {
      if (conn && typeof conn.release === 'function') conn.release();
    }

    if (!inserted) {
      return res.status(500).json({ success: false, message: 'Failed to add requirement after retries' });
    }

    res.json({
      success: true,
      message: 'Requirement added successfully',
      data: inserted
    });
    if (req.user && req.user.userId) {
      try {
        recordLog(req.user.userId, 'RequirementAdded', {
          RequirementID: inserted.RequirementID,
          RequirementCode: inserted.RequirementCode,
          CriteriaID: inserted.CriteriaID,
          CriteriaCode: criteriaRow.CriteriaCode || null,
          CriteriaName: criteriaRow.CriteriaName || null,
          EventID: criteriaRow.EventID || null,
          EventName: criteriaRow.EventName || null
        });
      } catch (e) {}
    }
  } catch (error) {
    console.error('Error adding requirement:', error);
    if (error.sql) {
      console.error('SQL:', error.sql);
      console.error('SQL Params:', error.parameters || error.values || 'N/A');
    }

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'Requirement code already exists'
      });
    }

    if (error.message === 'Selected parent requirement was not found') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error adding requirement',
      error: error.message,
      sql: error.sql || undefined,
      sqlParams: error.parameters || error.values || undefined
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

// Get requirements by criteria
const getRequirementsByCriteria = async (req, res) => {
  try {
    const { criteriaId } = req.params;

    const [requirements] = await db.query(`
      SELECT 
        r.*, 
        c.CriteriaName, 
        c.CriteriaCode,
        c.EventID,
        e.EventName,
        e.EventCode
      FROM requirements r
      LEFT JOIN criteria c ON r.CriteriaID = c.CriteriaID
      LEFT JOIN Events e ON c.EventID = e.EventID
      WHERE r.CriteriaID = ?
      ORDER BY r.RequirementCode ASC
    `, [criteriaId]);

    res.json({
      success: true,
      data: requirements
    });
  } catch (error) {
    console.error('Error fetching requirements by criteria:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching requirements by criteria'
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
      'INSERT INTO Events (EventName, EventCode, Description, CreatedAt, UpdatedAt) VALUES (?, ?, ?, NOW(), NOW())',
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
      'UPDATE Events SET EventName = ?, EventCode = ?, Description = ?, UpdatedAt = NOW() WHERE EventID = ?',
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
    let { RequirementCode, Description, CriteriaID, ParentRequirementCode, ParentRequirementID } = req.body;

    const [existingRows] = await db.query(
      `SELECT RequirementID, RequirementCode, Description, CriteriaID, ParentRequirementCode, ParentRequirementID
       FROM requirements
       WHERE RequirementID = ?
       LIMIT 1`,
      [id]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Requirement not found'
      });
    }

    const existing = existingRows[0];

    // Validate required fields
    if (!Description || !CriteriaID) {
      return res.status(400).json({
        success: false,
        message: 'Description and criteria are required'
      });
    }

    CriteriaID = Number(CriteriaID);
    if (!Number.isInteger(CriteriaID) || CriteriaID <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid criteria selected'
      });
    }

    const [criteria] = await db.query(
      `SELECT c.CriteriaCode, c.CriteriaName, c.EventID, e.EventName
       FROM criteria c
       LEFT JOIN Events e ON c.EventID = e.EventID
       WHERE c.CriteriaID = ?
       LIMIT 1`,
      [CriteriaID]
    );

    if (criteria.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid criteria selected'
      });
    }

    const criteriaRow = criteria[0];
    const criteriaCode = criteriaRow.CriteriaCode;
    const { parentCode, parentId } = await resolveParentRequirement(ParentRequirementCode || ParentRequirementID);

    // Auto-generate RequirementCode if parent is selected (same logic as add)
    if (parentCode) {
      if (!RequirementCode || RequirementCode.trim() === '') {
        // No code provided - auto-generate next number
        const [children] = await db.query(
          'SELECT RequirementCode FROM requirements WHERE RequirementCode LIKE ? AND RequirementID <> ? ORDER BY LENGTH(RequirementCode) DESC, RequirementCode DESC LIMIT 1',
          [`${parentCode}.%`, id]
        );

        if (children.length > 0) {
          const lastChild = children[0].RequirementCode;
          const parts = lastChild.split('.');
          const lastNumber = parseInt(parts[parts.length - 1]) || 0;
          RequirementCode = `${parentCode}.${lastNumber + 1}`;
        } else {
          RequirementCode = `${parentCode}.1`;
        }
      } else if (!/\./.test(RequirementCode)) {
        // Code provided but it's just a number (no dot) - append to parent
        RequirementCode = `${parentCode}.${RequirementCode}`;
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

      // If user enters just a number, join with criteria code
      if (!/\./.test(RequirementCode)) {
        RequirementCode = `${criteriaCode}.${RequirementCode}`;
      }
      // If RequirementCode already has dots, use it as-is
    }

    const updateAttempts = [
      {
        sql: 'UPDATE requirements SET RequirementCode = ?, Description = ?, CriteriaID = ?, ParentRequirementCode = ?, UpdatedAt = NOW() WHERE RequirementID = ?',
        params: [RequirementCode, Description, CriteriaID, parentCode, id]
      },
      {
        sql: 'UPDATE requirements SET RequirementCode = ?, Description = ?, CriteriaID = ?, ParentRequirementCode = ? WHERE RequirementID = ?',
        params: [RequirementCode, Description, CriteriaID, parentCode, id]
      },
      {
        sql: 'UPDATE requirements SET RequirementCode = ?, Description = ?, CriteriaID = ?, ParentRequirementID = ?, UpdatedAt = NOW() WHERE RequirementID = ?',
        params: [RequirementCode, Description, CriteriaID, parentId, id]
      },
      {
        sql: 'UPDATE requirements SET RequirementCode = ?, Description = ?, CriteriaID = ?, ParentRequirementID = ? WHERE RequirementID = ?',
        params: [RequirementCode, Description, CriteriaID, parentId, id]
      },
      {
        sql: 'UPDATE requirements SET RequirementCode = ?, Description = ?, CriteriaID = ?, UpdatedAt = NOW() WHERE RequirementID = ?',
        params: [RequirementCode, Description, CriteriaID, id]
      },
      {
        sql: 'UPDATE requirements SET RequirementCode = ?, Description = ?, CriteriaID = ? WHERE RequirementID = ?',
        params: [RequirementCode, Description, CriteriaID, id]
      }
    ];

    const [result] = await executeWithFallbacks(updateAttempts);

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
        ParentRequirementCode: parentCode,
        ParentRequirementID: parentId
      }
    });
    if (req.user && req.user.userId) {
      const changes = {};
      const addChange = (field, beforeValue, afterValue) => {
        const beforeNorm = beforeValue === undefined ? null : beforeValue;
        const afterNorm = afterValue === undefined ? null : afterValue;
        if (String(beforeNorm ?? '') !== String(afterNorm ?? '')) {
          changes[field] = { from: beforeNorm, to: afterNorm };
        }
      };

      addChange('RequirementCode', existing.RequirementCode, RequirementCode);
      addChange('Description', existing.Description, Description);
      addChange('CriteriaID', existing.CriteriaID, CriteriaID);
      addChange('ParentRequirementCode', existing.ParentRequirementCode, parentCode || null);
      addChange('ParentRequirementID', existing.ParentRequirementID, parentId || null);

      try {
        recordLog(req.user.userId, 'RequirementUpdated', {
          RequirementID: Number(id),
          RequirementCode,
          CriteriaID,
          CriteriaCode: criteriaRow.CriteriaCode || null,
          CriteriaName: criteriaRow.CriteriaName || null,
          EventID: criteriaRow.EventID || null,
          EventName: criteriaRow.EventName || null,
          changes
        });
      } catch (e) {}
    }
  } catch (error) {
    console.error('Error updating requirement:', error);

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'Requirement code already exists'
      });
    }

    if (error.message === 'Selected parent requirement was not found') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error updating requirement',
      error: error.message
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

    // Before deleting requirements, remove any uploaded proof documents (files + DB rows)
    try {
      const placeholders = requirementIds.map(() => '?').join(',');
      const [files] = await db.query(
        `SELECT id, file_path FROM office_proof_documents WHERE requirement_id IN (${placeholders})`,
        requirementIds
      );
      if (files && files.length > 0) {
        for (const f of files) {
          try {
            const absPath = path.join(__dirname, '..', (f.file_path || '').replace(/^\//, ''));
            if (fs.existsSync(absPath)) {
              fs.unlinkSync(absPath);
            }
          } catch (fsErr) {
            console.warn('Failed to delete requirement proof file from disk during requirement removal:', fsErr);
          }
        }
        // remove DB records
        await db.query(`DELETE FROM office_proof_documents WHERE requirement_id IN (${placeholders})`, requirementIds);
      }
    } catch (cleanupErr) {
      console.error('Failed to cleanup office_proof_documents before deleting requirements:', cleanupErr);
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
    if (req.user && req.user.userId) {
      try { recordLog(req.user.userId, 'RequirementDeleted', { requirementIds }); } catch (e) {}
    }
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
    const actorUserId = req.user?.userId || Number(assignedBy) || null;

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

    if (actorUserId) {
      try {
        const [[requirementRow]] = await db.query(
          `SELECT
             r.RequirementCode,
             r.Description,
             o.OfficeName,
             e.EventName
           FROM requirements r
           LEFT JOIN criteria c ON c.CriteriaID = r.CriteriaID
           LEFT JOIN events e ON e.EventID = c.EventID
           LEFT JOIN offices o ON o.OfficeID = ?
           WHERE r.RequirementID = ?
           LIMIT 1`,
          [officeId || null, requirementId]
        );

        const requirementCode = requirementRow?.RequirementCode || `Requirement #${requirementId}`;
        const officeName = requirementRow?.OfficeName || 'your office';
        const eventName = requirementRow?.EventName || 'an event';
        const message = `You were assigned to ${requirementCode} for office ${officeName} in ${eventName}.`;

        await createNotifications({
          userIds: newUserIds,
          adminId: actorUserId,
          title: 'New Requirement Assignment',
          message,
          type: 'info',
          relatedTable: 'requirements_assignment',
          relatedId: Number(officeId),
          meta: {
            officeId: Number(officeId),
            requirementId: Number(requirementId),
            openSubmission: true,
          },
        });
      } catch (notifError) {
        console.error('Failed to create requirement assignment notifications:', notifError);
      }
    }

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
        MAX(rua.AssignmentID) AS AssignmentID,
        rua.RequirementID,
        rua.OfficeID,
        rua.UserID,
        MIN(rua.AssignedAt) AS AssignedAt,
        MAX(rua.AssignedBy) AS AssignedBy,
        bool_or(rua.HasUploaded) AS HasUploaded,
        u.FirstName,
        u.MiddleInitial,
        u.LastName,
        u.Email,
        u.ProfilePic
      FROM (
        SELECT 
          AssignmentID, RequirementID, OfficeID, UserID, AssignedAt, AssignedBy, HasUploaded
        FROM requirement_user_assignments
        WHERE RequirementID = ?
        UNION
        SELECT 
          NULL AS AssignmentID, 
          requirement_id AS RequirementID, 
          office_id AS OfficeID, 
          uploaded_by AS UserID, 
          uploaded_at AS AssignedAt, 
          NULL AS AssignedBy, 
          TRUE AS HasUploaded
        FROM office_proof_documents
        WHERE requirement_id = ?
      ) rua
      JOIN users u ON rua.UserID = u.UserID
    `;
    const params = [requirementId, requirementId];
    if (officeId) {
      query += ' WHERE rua.OfficeID = ?';
      params.push(officeId);
    }
    query += ' GROUP BY rua.UserID, rua.RequirementID, rua.OfficeID, u.FirstName, u.MiddleInitial, u.LastName, u.Email, u.ProfilePic';
    query += ' ORDER BY AssignedAt DESC';

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

// Get all requirement assignments for the logged-in user
const getMyAssignments = async (req, res) => {
  try {
    const userId = Number(req.user?.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized user context',
      });
    }

    const [rows] = await db.query(
      `SELECT
         rua.AssignmentID,
         rua.RequirementID,
         rua.OfficeID,
         rua.HasUploaded,
         rua.AssignedAt,
         r.RequirementCode,
         r.Description,
         o.OfficeName,
         e.EventName,
         e.EventID
       FROM requirement_user_assignments rua
       LEFT JOIN requirements r ON r.RequirementID = rua.RequirementID
       LEFT JOIN criteria c ON c.CriteriaID = r.CriteriaID
       LEFT JOIN events e ON e.EventID = c.EventID
       LEFT JOIN offices o ON o.OfficeID = rua.OfficeID
       WHERE rua.UserID = ?
       ORDER BY rua.AssignedAt DESC`,
      [userId]
    );

    const officeIds = Array.from(
      new Set(rows.map((row) => row.OfficeID).filter((id) => id !== null && id !== undefined))
    );

    const requirementIds = Array.from(
      new Set(rows.map((row) => row.RequirementID).filter((id) => id !== null && id !== undefined))
    );

    res.json({
      success: true,
      data: rows,
      officeIds,
      requirementIds,
    });
  } catch (error) {
    console.error('Error fetching my assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching my assignments',
    });
  }
};

// Remove user assignment from a requirement
const removeUserAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;

    // Load the assignment to know requirementId and userId
    const [assignRows] = await db.query(
      'SELECT AssignmentID, RequirementID, OfficeID, UserID FROM requirement_user_assignments WHERE AssignmentID = ? LIMIT 1',
      [assignmentId]
    );

    if (!assignRows || assignRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    const assign = assignRows[0];
    const requirementId = assign.RequirementID;
    const userId = assign.UserID;
    const officeId = assign.OfficeID;

    // Delete uploaded proof documents related to this user + requirement (if any)
    try {
      const [files] = await db.query(
        'SELECT id, file_name, file_path FROM office_proof_documents WHERE requirement_id = ? AND uploaded_by = ?',
        [requirementId, userId]
      );

      if (files && files.length > 0) {
        for (const f of files) {
          try {
            const absPath = path.join(__dirname, '..', (f.file_path || '').replace(/^\//, ''));
            if (fs.existsSync(absPath)) {
              fs.unlinkSync(absPath);
            }
          } catch (fsErr) {
            console.warn('Failed to delete uploaded file from disk for assignment removal:', fsErr);
          }
        }

        // Remove DB records for those files
        await db.query('DELETE FROM office_proof_documents WHERE requirement_id = ? AND uploaded_by = ?', [requirementId, userId]);

        // Try to log the unsubmit action
        try {
          const actorUserId = Number(req.user?.userId || userId);
          if (Number.isInteger(actorUserId) && actorUserId > 0) {
            await recordLog(actorUserId, 'RequirementFileDeletedOnAssignmentRemove', {
              RequirementID: Number(requirementId),
              AssignmentID: Number(assignmentId),
              DeletedByUserID: Number(userId),
              OfficeID: officeId || null
            });
          }
        } catch (logErr) {
          console.error('Failed to record file deletion log during assignment removal:', logErr);
        }
      }
    } catch (fileErr) {
      console.error('Error while cleaning uploaded files for removed assignment:', fileErr);
    }

    // Finally delete the assignment row
    const [result] = await db.query('DELETE FROM requirement_user_assignments WHERE AssignmentID = ?', [assignmentId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    res.json({ success: true, message: 'User assignment removed successfully' });
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

      let users = [];
      // If officeId is provided, return both users with the 'Personnel' role and office heads for that office
      if (officeId) {
        // Only fetch office heads for the provided office
        const [headUsers] = await db.query(`
          SELECT u.UserID, u.FirstName, u.MiddleInitial, u.LastName, u.Email, u.ProfilePic
          FROM headofoffice h
          INNER JOIN office_head_assignments oha ON oha.HeadID = h.HeadID
          INNER JOIN users u ON u.UserID = h.UserID
          WHERE oha.OfficeID = ? AND u.approval_status = 'approved'
          ORDER BY u.FirstName, u.LastName
        `, [officeId]);

        users = headUsers || [];
      } else {
        // Get all approved users with RoleID = 2 (legacy behavior)
        const [allUsers] = await db.query(`
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
        users = allUsers;
      }

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
      let usersWithStatus = users.map(user => ({
        ...user,
        isAssigned: assignedUserIds.includes(user.UserID)
      }));

      // If there are no available (not-yet-assigned) users and an officeId is provided,
      // fall back to returning office heads for that office (they may not have the Personnel role).
      const available = usersWithStatus.filter(u => !u.isAssigned);
      if (available.length === 0 && officeId) {
        // Fetch office heads specifically
        const [fallbackHeads] = await db.query(`
          SELECT u.UserID, u.FirstName, u.MiddleInitial, u.LastName, u.Email, u.ProfilePic
          FROM headofoffice h
          INNER JOIN office_head_assignments oha ON oha.HeadID = h.HeadID
          INNER JOIN users u ON u.UserID = h.UserID
          WHERE oha.OfficeID = ? AND u.approval_status = 'approved'
          ORDER BY u.FirstName, u.LastName
        `, [officeId]);

        // mark assignment status for heads (likely false since available was empty)
        usersWithStatus = (fallbackHeads || []).map(user => ({
          ...user,
          isAssigned: assignedUserIds.includes(user.UserID)
        }));
      }

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
      [hasUploaded ? true : false, assignmentId]
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
      'UPDATE requirement_user_assignments SET HasUploaded = TRUE WHERE RequirementID = ? AND UserID = ?',
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

// Helper: Auto-assign office heads to one or many requirements for an office
const autoAssignHeadsToRequirementsForOffice = async (officeId, requirementIds = [], actorUserId = null) => {
  if (!officeId || !Array.isArray(requirementIds) || requirementIds.length === 0) return { success: true, assigned: 0 };

  // Get head user IDs for the office
  const [headRows] = await db.query(
    `SELECT h.UserID FROM office_head_assignments oha
     JOIN headofoffice h ON oha.HeadID = h.HeadID
     WHERE oha.OfficeID = ?`,
    [officeId]
  );

  const headUserIds = headRows.map(r => Number(r.UserID)).filter(id => Number.isInteger(id) && id > 0);
  if (headUserIds.length === 0) return { success: true, assigned: 0 };

  let totalAssigned = 0;

  for (const reqId of requirementIds) {
    const requirementId = Number(reqId);
    if (!Number.isInteger(requirementId) || requirementId <= 0) continue;

    // how many already assigned to this requirement in this office
    const [countRows] = await db.query('SELECT COUNT(*) as count FROM requirement_user_assignments WHERE RequirementID = ? AND OfficeID = ?', [requirementId, officeId]);
    const currentCount = Number(countRows[0]?.count || 0);
    const remainingSlots = Math.max(0, 4 - currentCount);
    if (remainingSlots <= 0) continue;

    // which head users are not yet assigned to this requirement
    const placeholders = headUserIds.map(() => '?').join(',');
    const alreadyQuery = `SELECT UserID FROM requirement_user_assignments WHERE RequirementID = ? AND OfficeID = ? AND UserID IN (${placeholders})`;
    const alreadyParams = [requirementId, officeId, ...headUserIds];
    const [alreadyRows] = await db.query(alreadyQuery, alreadyParams);
    const alreadyAssignedIds = new Set(alreadyRows.map(r => Number(r.UserID)));

    const toAssign = headUserIds.filter(id => !alreadyAssignedIds.has(id)).slice(0, remainingSlots);
    if (toAssign.length === 0) continue;

    const insertValues = toAssign.map(userId => [requirementId, officeId, userId, actorUserId || null]);
    await db.query('INSERT INTO requirement_user_assignments (RequirementID, OfficeID, UserID, AssignedBy) VALUES ?', [insertValues]);

    // send notifications (best-effort)
    try {
      const [[requirementRow]] = await db.query(
        `SELECT r.RequirementCode, o.OfficeName, e.EventName
         FROM requirements r
         LEFT JOIN criteria c ON c.CriteriaID = r.CriteriaID
         LEFT JOIN events e ON e.EventID = c.EventID
         LEFT JOIN offices o ON o.OfficeID = ?
         WHERE r.RequirementID = ?
         LIMIT 1`,
        [officeId, requirementId]
      );

      const requirementCode = requirementRow?.RequirementCode || `Requirement #${requirementId}`;
      const officeName = requirementRow?.OfficeName || 'your office';
      const eventName = requirementRow?.EventName || 'an event';
      const message = `You were assigned to ${requirementCode} for office ${officeName} in ${eventName}.`;

      await createNotifications({
        userIds: toAssign,
        adminId: actorUserId,
        title: 'New Requirement Assignment',
        message,
        type: 'info',
        relatedTable: 'requirements_assignment',
        relatedId: Number(officeId),
        meta: {
          officeId: Number(officeId),
          requirementId: Number(requirementId),
          openSubmission: true,
        },
      });
    } catch (notifErr) {
      console.error('autoAssign: failed to notify assigned users', notifErr);
    }

    totalAssigned += toAssign.length;
  }

  return { success: true, assigned: totalAssigned };
};

module.exports = {
  getAllRequirements,
  getRequirementsByEvent,
  getRequirementsByCriteria,
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
  getMyAssignments,
  removeUserAssignment,
  getUserAssignmentCount,
  getAvailableUsersForAssignment,
  updateUserUploadStatus,
  markUserAsUploaded,
  autoAssignHeadsToRequirementsForOffice
};
