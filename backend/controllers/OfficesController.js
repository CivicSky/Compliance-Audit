const db = require("../db");

const OfficesController = {
  // ================================
  // GET ALL OFFICES (WITH JOINED DATA - SUPPORTS MULTIPLE HEADS)
  // ================================
  getAll: async (req, res) => {
    try {
      // First get all offices with basic info
      const [officeRows] = await db.query(`
        SELECT 
          o.OfficeID,
          o.OfficeName,
          o.OfficeTypeID,
          o.HeadID,
          o.EventID,
          ot.TypeName,
          os.OverallStatus,
          os.CompliancePercent,
          os.TotalRequirements,
          os.CompliedCount,
          os.PartiallyCompliedCount,
          os.NotCompliedCount
        FROM offices o
        LEFT JOIN officetypes ot ON o.OfficeTypeID = ot.OfficeTypeID
        LEFT JOIN OverallOfficeStatus os ON o.OfficeID = os.OfficeID
      `);

      // Get all heads assigned to offices (via headofoffice.OfficeID)
      const [headRows] = await db.query(`
        SELECT 
          h.HeadID,
          h.OfficeID,
          h.Position,
          u.FirstName,
          u.MiddleInitial,
          u.LastName,
          u.ProfilePic
        FROM headofoffice h
        LEFT JOIN users u ON h.UserID = u.UserID
        WHERE h.OfficeID IS NOT NULL
      `);

      // Group heads by OfficeID
      const headsByOffice = {};
      headRows.forEach(head => {
        if (!headsByOffice[head.OfficeID]) {
          headsByOffice[head.OfficeID] = [];
        }
        headsByOffice[head.OfficeID].push({
          HeadID: head.HeadID,
          FirstName: head.FirstName,
          MiddleInitial: head.MiddleInitial,
          LastName: head.LastName,
          Position: head.Position,
          ProfilePic: head.ProfilePic,
          full_name: head.FirstName ? `${head.FirstName} ${head.MiddleInitial ? head.MiddleInitial + '.' : ''} ${head.LastName}`.trim() : 'Unknown'
        });
      });

      const formatted = officeRows.map(r => {
        const officeHeads = headsByOffice[r.OfficeID] || [];
        // For backward compatibility, also include primary head info
        const primaryHead = officeHeads[0] || null;
        
        return {
          id: r.OfficeID,
          office_name: r.OfficeName,
          office_type_id: r.OfficeTypeID,
          office_type_name: r.TypeName || "Unknown Type",
          head_id: r.HeadID, // Legacy single head ID
          head_ids: officeHeads.map(h => h.HeadID), // Array of head IDs
          heads: officeHeads, // Full head objects
          head_name: officeHeads.length > 0 
            ? officeHeads.map(h => h.full_name).join(', ')
            : "Unassigned",
          head_profile_pic: primaryHead?.ProfilePic || null,
          event_id: r.EventID,
          overall_status: r.OverallStatus || 'Not Complied',
          compliance_percent: r.CompliancePercent || 0,
          total_requirements: r.TotalRequirements || 0,
          complied_count: r.CompliedCount || 0,
          partially_complied_count: r.PartiallyCompliedCount || 0,
          not_complied_count: r.NotCompliedCount || 0
        };
      });

      console.log('Formatted offices with multiple heads:', formatted);
      res.json({ success: true, data: formatted });
    } catch (err) {
      console.error("Error fetching offices:", err);
      console.error("Error details:", err.message);
      res.status(500).json({ error: "Database error", details: err.message });
    }
  },

  // ================================
  // GET OFFICE BY ID
  // ================================
  getById: async (req, res) => {
    const id = req.params.id;

    try {
      const [rows] = await db.query(`
        SELECT 
          o.OfficeID,
          o.OfficeName,
          o.OfficeTypeID,
          o.HeadID,
          o.EventID,
          t.TypeName,
          u.FirstName,
          u.LastName,
          os.OverallStatus,
          os.CompliancePercent,
          os.TotalRequirements
        FROM offices o
        LEFT JOIN officetypes t ON o.OfficeTypeID = t.OfficeTypeID
        LEFT JOIN headofoffice h ON o.HeadID = h.HeadID
        LEFT JOIN users u ON h.UserID = u.UserID
        LEFT JOIN OverallOfficeStatus os ON o.OfficeID = os.OfficeID
        WHERE o.OfficeID = ?
      `, [id]);

      if (rows.length === 0) {
        return res.status(404).json({ message: "Office not found" });
      }

      const r = rows[0];

      res.json({
        OfficeID: r.OfficeID,
        OfficeName: r.OfficeName,
        OfficeTypeID: r.OfficeTypeID,
        TypeName: r.TypeName || "Unknown Type",
        HeadID: r.HeadID,
        HeadName: r.FirstName ? `${r.FirstName} ${r.LastName}` : "Unknown Head",
        EventID: r.EventID,
        OverallStatus: r.OverallStatus || 'Not Complied',
        CompliancePercent: r.CompliancePercent || 0,
        TotalRequirements: r.TotalRequirements || 0
      });
    } catch (err) {
      console.error("Error fetching office:", err);
      res.status(500).json({ error: "Database error" });
    }
  },

  // ================================
  // CREATE NEW OFFICE (SUPPORTS MULTIPLE HEADS)
  // ================================
  create: async (req, res) => {
    const { OfficeName, OfficeTypeID, HeadID, HeadIDs, EventID } = req.body;

    // Support both single HeadID (legacy) and HeadIDs array (new)
    const headIdArray = HeadIDs || (HeadID ? [HeadID] : []);

    console.log('Received create office request:', { OfficeName, OfficeTypeID, headIdArray, EventID });

    try {
      // Create the office (HeadID field kept for backward compatibility, stores first head)
      const [result] = await db.query(
        `INSERT INTO offices (OfficeName, OfficeTypeID, HeadID, EventID)
         VALUES (?, ?, ?, ?)`,
        [
          OfficeName,
          OfficeTypeID || null,
          headIdArray.length > 0 ? headIdArray[0] : null,
          EventID || null
        ]
      );

      const newOfficeId = result.insertId;
      console.log('Office created successfully:', newOfficeId);

      // Assign all heads to this office (update headofoffice.OfficeID)
      if (headIdArray.length > 0) {
        for (const hid of headIdArray) {
          await db.query(
            `UPDATE headofoffice SET OfficeID = ? WHERE HeadID = ?`,
            [newOfficeId, hid]
          );
        }
        console.log('Assigned heads to office:', headIdArray);
      }

      // Initialize OverallOfficeStatus for the new office
      await updateOverallOfficeStatus(newOfficeId);

      res.json({
        success: true,
        message: 'Office created successfully',
        data: {
          OfficeID: newOfficeId,
          OfficeName,
          OfficeTypeID,
          HeadIDs: headIdArray,
          EventID
        }
      });
    } catch (err) {
      console.error("Error creating office:", err);
      console.error("Error details:", err.message);
      console.error("Error SQL:", err.sql);
      res.status(500).json({ 
        success: false, 
        error: "Database error", 
        details: err.message 
      });
    }
  },

  // ================================
  // UPDATE OFFICE (SUPPORTS MULTIPLE HEADS)
  // ================================
  update: async (req, res) => {
    const id = req.params.id;
    const { OfficeName, OfficeTypeID, HeadID, HeadIDs, EventID } = req.body;

    // Support both single HeadID (legacy) and HeadIDs array (new)
    const headIdArray = HeadIDs || (HeadID ? [HeadID] : []);

    try {
      // Update the office basic info (HeadID for backward compatibility)
      const [result] = await db.query(
        `UPDATE offices 
         SET OfficeName = ?, OfficeTypeID = ?, HeadID = ?, EventID = ?
         WHERE OfficeID = ?`,
        [OfficeName, OfficeTypeID, headIdArray.length > 0 ? headIdArray[0] : null, EventID, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: "Office not found" });
      }

      // Unassign all heads currently assigned to this office
      await db.query(
        `UPDATE headofoffice SET OfficeID = NULL WHERE OfficeID = ?`,
        [id]
      );

      // Assign all new heads to this office
      if (headIdArray.length > 0) {
        for (const hid of headIdArray) {
          await db.query(
            `UPDATE headofoffice SET OfficeID = ? WHERE HeadID = ?`,
            [id, hid]
          );
        }
        console.log('Updated heads for office', id, ':', headIdArray);
      }

      res.json({ success: true, message: "Office updated successfully" });
    } catch (err) {
      console.error("Error updating office:", err);
      res.status(500).json({ success: false, error: "Database error" });
    }
  },

  // ================================
  // DELETE OFFICE
  // ================================
  delete: async (req, res) => {
    const id = req.params.id;

    try {
      // First, delete all requirements associated with this office
      await db.query("DELETE FROM compliancestatusoffices WHERE OfficeID = ?", [id]);

      // Unassign office heads from this office (if OfficeID is stored in headofoffice)
      await db.query("UPDATE headofoffice SET OfficeID = NULL WHERE OfficeID = ?", [id]);

      // Then delete the office
      const [result] = await db.query("DELETE FROM offices WHERE OfficeID = ?", [id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Office not found" });
      }

      res.json({ message: "Office deleted successfully" });
    } catch (err) {
      console.error("Error deleting office:", err);
      res.status(500).json({ error: "Database error" });
    }
  },

  // ================================
  // GET OFFICE REQUIREMENTS
  // ================================
  getOfficeRequirements: async (req, res) => {
    try {
        const { id } = req.params;

        const query = `
        SELECT 
          r.RequirementID,
          r.RequirementCode,
          r.Description,
          r.CriteriaID,
          c.CriteriaName,
          c.CriteriaCode,
          c.AreaID,
          a.AreaCode,
          a.AreaName,
          cso.Status as ComplianceStatusID,
          cst.StatusName as ComplianceStatus,
          cso.comments
        FROM compliancestatusoffices cso
        INNER JOIN requirements r ON cso.RequirementID = r.RequirementID
        LEFT JOIN criteria c ON r.CriteriaID = c.CriteriaID
        LEFT JOIN areas a ON c.AreaID = a.AreaID
        LEFT JOIN compliancestatustypes cst ON cso.Status = cst.StatusID
        WHERE cso.OfficeID = ?
        ORDER BY a.SortOrder ASC, c.CriteriaCode ASC, r.RequirementCode ASC
      `;

        const [results] = await db.query(query, [id]);

        res.json({
            success: true,
            data: results
        });

    } catch (err) {
        console.error('Error fetching office requirements:', err);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch office requirements',
            details: err.message 
        });
    }
  },

  // ================================
  // ADD REQUIREMENTS TO OFFICE
  // ================================
  addOfficeRequirements: async (req, res) => {
    const officeId = req.params.id;
    const { requirementIds } = req.body;

    if (!Array.isArray(requirementIds) || requirementIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "requirementIds must be a non-empty array" 
      });
    }

    try {
      // Check if office exists
      const [office] = await db.query("SELECT OfficeID FROM offices WHERE OfficeID = ?", [officeId]);
      if (office.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: "Office not found" 
        });
      }

      // Insert requirements (ignore duplicates)
      const values = requirementIds.map(reqId => [officeId, reqId, 3]); // Default status: 3 = Not Complied
      
      await db.query(`
        INSERT INTO compliancestatusoffices (OfficeID, RequirementID, Status)
        VALUES ?
        ON DUPLICATE KEY UPDATE RequirementID = RequirementID
      `, [values]);

      // Update the overall office status
      await updateOverallOfficeStatus(officeId);

      res.json({ 
        success: true, 
        message: `${requirementIds.length} requirement(s) added successfully` 
      });
    } catch (err) {
      console.error("Error adding office requirements:", err);
      res.status(500).json({ 
        success: false, 
        error: "Database error", 
        details: err.message 
      });
    }
  },

  // ================================
  // REMOVE REQUIREMENT FROM OFFICE
  // ================================
  removeOfficeRequirement: async (req, res) => {
    const { id: officeId, requirementId } = req.params;

    try {
      const [result] = await db.query(
        "DELETE FROM compliancestatusoffices WHERE OfficeID = ? AND RequirementID = ?",
        [officeId, requirementId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ 
          success: false, 
          message: "Requirement not found for this office" 
        });
      }

      // Update the overall office status after removal
      await updateOverallOfficeStatus(officeId);

      res.json({ 
        success: true, 
        message: "Requirement removed successfully" 
      });
    } catch (err) {
      console.error("Error removing office requirement:", err);
      res.status(500).json({ 
        success: false, 
        error: "Database error", 
        details: err.message 
      });
    }
  },

  // ================================
  // UPDATE REQUIREMENT STATUS
  // ================================
  updateRequirementStatus: async (req, res) => {
    const { id: officeId, requirementId } = req.params;
    const { statusId, comments } = req.body;

    if (!statusId || ![3, 4, 5].includes(Number(statusId))) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be 3 (Not Complied), 4 (Partially Complied), or 5 (Complied)"
      });
    }

    try {
      // Use INSERT ... ON DUPLICATE KEY UPDATE to handle both insert and update, including comments
      await db.query(
        `INSERT INTO compliancestatusoffices (OfficeID, RequirementID, Status, comments)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE Status = ?, comments = ?`,
        [officeId, requirementId, statusId, comments || null, statusId, comments || null]
      );

      // Update the overall office status
      await updateOverallOfficeStatus(officeId);

      res.json({
        success: true,
        message: "Compliance status and comment updated successfully"
      });
    } catch (err) {
      console.error("Error updating requirement status:", err);
      res.status(500).json({
        success: false,
        error: "Database error",
        details: err.message
      });
    }
  }
};

// ================================
// HELPER FUNCTION: UPDATE OVERALL OFFICE STATUS
// ================================
async function updateOverallOfficeStatus(officeId) {
  try {
    // Get counts for each status
    const [counts] = await db.query(`
      SELECT 
        COUNT(*) as TotalRequirements,
        SUM(CASE WHEN Status = 5 THEN 1 ELSE 0 END) as CompliedCount,
        SUM(CASE WHEN Status = 4 THEN 1 ELSE 0 END) as PartiallyCompliedCount,
        SUM(CASE WHEN Status = 3 THEN 1 ELSE 0 END) as NotCompliedCount
      FROM compliancestatusoffices
      WHERE OfficeID = ?
    `, [officeId]);

    const total = counts[0].TotalRequirements || 0;
    const complied = counts[0].CompliedCount || 0;
    const partially = counts[0].PartiallyCompliedCount || 0;
    const notComplied = counts[0].NotCompliedCount || 0;

    // Calculate percentage: Complied = 100%, Partially = 50%, Not Complied = 0%
    let compliancePercent = 0;
    if (total > 0) {
      const weightedScore = (complied * 100) + (partially * 50);
      const maxScore = total * 100;
      compliancePercent = (weightedScore / maxScore) * 100;
    }

    // Determine overall status based on percentage
    let overallStatus = 'Not Complied';
    if (compliancePercent === 100) {
      overallStatus = 'Complied';
    } else if (compliancePercent >= 50) {
      overallStatus = 'Partially Complied';
    }

    // Insert or update the overall status
    await db.query(`
      INSERT INTO OverallOfficeStatus 
        (OfficeID, CompliedCount, PartiallyCompliedCount, NotCompliedCount, TotalRequirements, CompliancePercent, OverallStatus)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        CompliedCount = VALUES(CompliedCount),
        PartiallyCompliedCount = VALUES(PartiallyCompliedCount),
        NotCompliedCount = VALUES(NotCompliedCount),
        TotalRequirements = VALUES(TotalRequirements),
        CompliancePercent = VALUES(CompliancePercent),
        OverallStatus = VALUES(OverallStatus),
        LastUpdated = CURRENT_TIMESTAMP
    `, [officeId, complied, partially, notComplied, total, compliancePercent.toFixed(2), overallStatus]);

  } catch (err) {
    console.error('Error updating overall office status:', err);
    throw err;
  }
}

module.exports = OfficesController;
