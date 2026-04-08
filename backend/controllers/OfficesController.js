const db = require("../db");
const ExcelJS = require("exceljs");
const { recordLog } = require('./logsController');
const { createNotifications } = require('../utils/notificationService');
const MAX_HEADS_PER_OFFICE = 4;

const normalizeComplianceStatus = (statusId, statusName) => {
  const id = Number(statusId);
  if (id === 5) return 'Compiled';
  if (id === 4) return 'Partially Compiled';
  if (id === 3) return 'Not Compiled';

  const normalized = String(statusName || '').trim().toLowerCase();
  if (normalized.includes('partial')) return 'Partially Compiled';
  if (normalized.includes('not')) return 'Not Compiled';
  if (normalized.includes('comp')) return 'Compiled';
  return 'Not Compiled';
};

const normalizeHeadIds = (headIds, headId) => {
  const source = Array.isArray(headIds) ? headIds : (headId != null ? [headId] : []);
  return [...new Set(source.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];
};

const formatUserName = (row) => {
  if (!row) return 'Unknown';
  const first = String(row.FirstName || '').trim();
  const middle = String(row.MiddleInitial || '').trim();
  const last = String(row.LastName || '').trim();
  return `${first}${middle ? ` ${middle}.` : ''} ${last}`.replace(/\s+/g, ' ').trim() || 'Unknown';
};

const getNamesByHeadIds = async (headIds = []) => {
  if (!Array.isArray(headIds) || headIds.length === 0) return [];
  const placeholders = headIds.map(() => '?').join(',');
  const [rows] = await db.query(
    `SELECT h.HeadID, u.FirstName, u.MiddleInitial, u.LastName
     FROM headofoffice h
     LEFT JOIN users u ON h.UserID = u.UserID
     WHERE h.HeadID IN (${placeholders})`,
    headIds
  );
  const map = new Map(rows.map((row) => [Number(row.HeadID), formatUserName(row)]));
  return headIds.map((id) => map.get(Number(id)) || `Head #${id}`);
};

const getHeadAssignmentDetailsByHeadIds = async (headIds = []) => {
  if (!Array.isArray(headIds) || headIds.length === 0) return [];
  const placeholders = headIds.map(() => '?').join(',');
  const [rows] = await db.query(
    `SELECT h.HeadID, h.UserID, u.FirstName, u.MiddleInitial, u.LastName
     FROM headofoffice h
     LEFT JOIN users u ON h.UserID = u.UserID
     WHERE h.HeadID IN (${placeholders})`,
    headIds
  );

  const byHeadId = new Map(
    rows.map((row) => [Number(row.HeadID), {
      headId: Number(row.HeadID),
      userId: Number(row.UserID),
      fullName: formatUserName(row),
    }])
  );

  return headIds
    .map((headId) => byHeadId.get(Number(headId)))
    .filter((row) => row && Number.isInteger(row.userId));
};

const getOfficeTypeName = async (officeTypeId) => {
  if (!officeTypeId) return 'Unassigned';
  const [rows] = await db.query('SELECT TypeName FROM officetypes WHERE OfficeTypeID = ? LIMIT 1', [officeTypeId]);
  return rows[0]?.TypeName || 'Unknown Type';
};

const getEventName = async (eventId) => {
  if (!eventId) return 'No event';
  const [rows] = await db.query('SELECT EventName FROM events WHERE EventID = ? LIMIT 1', [eventId]);
  return rows[0]?.EventName || `Event #${eventId}`;
};

const getOfficeSnapshot = async (officeId) => {
  const [officeRows] = await db.query(
    `SELECT o.OfficeID, o.OfficeName, o.OfficeTypeID, o.EventID,
            ot.TypeName AS OfficeTypeName,
            e.EventName
     FROM offices o
     LEFT JOIN officetypes ot ON o.OfficeTypeID = ot.OfficeTypeID
     LEFT JOIN events e ON o.EventID = e.EventID
     WHERE o.OfficeID = ?
     LIMIT 1`,
    [officeId]
  );

  if (officeRows.length === 0) return null;

  const [headRows] = await db.query(
    `SELECT h.HeadID, u.FirstName, u.MiddleInitial, u.LastName
     FROM office_head_assignments oha
     INNER JOIN headofoffice h ON oha.HeadID = h.HeadID
     LEFT JOIN users u ON h.UserID = u.UserID
     WHERE oha.OfficeID = ?
     ORDER BY u.LastName ASC, u.FirstName ASC`,
    [officeId]
  );

  return {
    ...officeRows[0],
    HeadIDs: headRows.map((row) => Number(row.HeadID)),
    HeadNames: headRows.map((row) => formatUserName(row)),
  };
};

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
          o.EventID,
          e.EventName,
          ot.TypeName,
          os.OverallStatus,
          os.CompliancePercent,
          os.TotalRequirements,
          os.CompliedCount,
          os.PartiallyCompliedCount,
          os.NotCompliedCount
        FROM offices o
        LEFT JOIN Events e ON o.EventID = e.EventID
        LEFT JOIN officetypes ot ON o.OfficeTypeID = ot.OfficeTypeID
        LEFT JOIN (
          SELECT
            cso.OfficeID,
            COUNT(*) AS TotalRequirements,
            SUM(CASE WHEN cso.Status = 5 THEN 1 ELSE 0 END) AS CompliedCount,
            SUM(CASE WHEN cso.Status = 4 THEN 1 ELSE 0 END) AS PartiallyCompliedCount,
            SUM(CASE WHEN cso.Status = 3 THEN 1 ELSE 0 END) AS NotCompliedCount,
            CASE
              WHEN COUNT(*) = 0 THEN 0
              ELSE ROUND(
                ((SUM(CASE WHEN cso.Status = 5 THEN 1 ELSE 0 END) * 100) +
                (SUM(CASE WHEN cso.Status = 4 THEN 1 ELSE 0 END) * 50)) /
                COUNT(*),
                2
              )
            END AS CompliancePercent,
            CASE
              WHEN COUNT(*) = 0 THEN 'Not Complied'
              WHEN SUM(CASE WHEN cso.Status = 5 THEN 1 ELSE 0 END) = COUNT(*) THEN 'Complied'
              WHEN SUM(CASE WHEN cso.Status = 3 THEN 1 ELSE 0 END) = COUNT(*) THEN 'Not Complied'
              ELSE 'Partially Complied'
            END AS OverallStatus
          FROM compliancestatusoffices cso
          GROUP BY cso.OfficeID
        ) os ON o.OfficeID = os.OfficeID
      `);

      // Get all heads assigned to offices via assignment junction table
      const [headRows] = await db.query(`
        SELECT 
          h.HeadID,
          h.UserID,
          oha.OfficeID,
          h.Position,
          u.FirstName,
          u.MiddleInitial,
          u.LastName,
          u.ProfilePic
        FROM office_head_assignments oha
        INNER JOIN headofoffice h ON oha.HeadID = h.HeadID
        LEFT JOIN users u ON h.UserID = u.UserID
        WHERE oha.OfficeID IS NOT NULL
      `);

      // Group heads by OfficeID
      const headsByOffice = {};
      const seenUsersByOffice = {};
      headRows.forEach(head => {
        if (!headsByOffice[head.OfficeID]) {
          headsByOffice[head.OfficeID] = [];
          seenUsersByOffice[head.OfficeID] = new Set();
        }

        const uniquePersonKey = head.UserID != null ? `user-${head.UserID}` : `head-${head.HeadID}`;
        if (seenUsersByOffice[head.OfficeID].has(uniquePersonKey)) {
          return;
        }

        seenUsersByOffice[head.OfficeID].add(uniquePersonKey);
        headsByOffice[head.OfficeID].push({
          HeadID: head.HeadID,
          UserID: head.UserID,
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
          head_id: primaryHead?.HeadID || null,
          head_ids: officeHeads.map(h => h.HeadID), // Array of head IDs
          heads: officeHeads, // Full head objects
          head_name: officeHeads.length > 0 
            ? officeHeads.map(h => h.full_name).join(', ')
            : "Unassigned",
          head_profile_pic: primaryHead?.ProfilePic || null,
          event_id: r.EventID,
          event_name: r.EventName || null,
          EventName: r.EventName || null,
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
          o.EventID,
          t.TypeName,
          os.OverallStatus,
          os.CompliancePercent,
          os.TotalRequirements,
          e.EventName,
          e.EventCode
        FROM offices o
        LEFT JOIN officetypes t ON o.OfficeTypeID = t.OfficeTypeID
        LEFT JOIN (
          SELECT
            cso.OfficeID,
            COUNT(*) AS TotalRequirements,
            SUM(CASE WHEN cso.Status = 5 THEN 1 ELSE 0 END) AS CompliedCount,
            SUM(CASE WHEN cso.Status = 4 THEN 1 ELSE 0 END) AS PartiallyCompliedCount,
            SUM(CASE WHEN cso.Status = 3 THEN 1 ELSE 0 END) AS NotCompliedCount,
            CASE
              WHEN COUNT(*) = 0 THEN 0
              ELSE ROUND(
                ((SUM(CASE WHEN cso.Status = 5 THEN 1 ELSE 0 END) * 100) +
                (SUM(CASE WHEN cso.Status = 4 THEN 1 ELSE 0 END) * 50)) /
                COUNT(*),
                2
              )
            END AS CompliancePercent,
            CASE
              WHEN COUNT(*) = 0 THEN 'Not Complied'
              WHEN SUM(CASE WHEN cso.Status = 5 THEN 1 ELSE 0 END) = COUNT(*) THEN 'Complied'
              WHEN SUM(CASE WHEN cso.Status = 3 THEN 1 ELSE 0 END) = COUNT(*) THEN 'Not Complied'
              ELSE 'Partially Complied'
            END AS OverallStatus
          FROM compliancestatusoffices cso
          GROUP BY cso.OfficeID
        ) os ON o.OfficeID = os.OfficeID
        LEFT JOIN Events e ON o.EventID = e.EventID
        WHERE o.OfficeID = ?
      `, [id]);

      if (rows.length === 0) {
        return res.status(404).json({ message: "Office not found" });
      }

      const r = rows[0];
      const [headRows] = await db.query(`
        SELECT
          h.HeadID,
          h.UserID,
          h.Position,
          u.FirstName,
          u.MiddleInitial,
          u.LastName,
          u.ProfilePic
        FROM office_head_assignments oha
        INNER JOIN headofoffice h ON oha.HeadID = h.HeadID
        LEFT JOIN users u ON h.UserID = u.UserID
        WHERE oha.OfficeID = ?
      `, [id]);

      const seenUsers = new Set();
      const officeHeads = headRows.filter((head) => {
        const uniquePersonKey = head.UserID != null ? `user-${head.UserID}` : `head-${head.HeadID}`;
        if (seenUsers.has(uniquePersonKey)) {
          return false;
        }
        seenUsers.add(uniquePersonKey);
        return true;
      }).map((head) => ({
        HeadID: head.HeadID,
        UserID: head.UserID,
        Position: head.Position,
        FirstName: head.FirstName,
        MiddleInitial: head.MiddleInitial,
        LastName: head.LastName,
        ProfilePic: head.ProfilePic,
        full_name: head.FirstName ? `${head.FirstName} ${head.MiddleInitial ? `${head.MiddleInitial}.` : ''} ${head.LastName}`.trim() : 'Unknown'
      }));
      const primaryHead = officeHeads[0] || null;

      res.json({
        OfficeID: r.OfficeID,
        OfficeName: r.OfficeName,
        OfficeTypeID: r.OfficeTypeID,
        TypeName: r.TypeName || "Unknown Type",
        HeadID: primaryHead?.HeadID || null,
        HeadIDs: officeHeads.map((head) => head.HeadID),
        Heads: officeHeads,
        HeadName: officeHeads.length > 0 ? officeHeads.map((head) => head.full_name).join(', ') : "Unknown Head",
        EventID: r.EventID,
        EventName: r.EventName || null,
        EventCode: r.EventCode || null,
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
    const headIdArray = normalizeHeadIds(HeadIDs, HeadID);

    if (headIdArray.length > MAX_HEADS_PER_OFFICE) {
      return res.status(400).json({
        success: false,
        message: `You can assign a maximum of ${MAX_HEADS_PER_OFFICE} heads per office`
      });
    }

    console.log('Received create office request:', { OfficeName, OfficeTypeID, headIdArray, EventID });

    try {
      // Create the office; head assignments are stored in office_head_assignments
      const [result] = await db.query(
        `INSERT INTO offices (OfficeName, OfficeTypeID, EventID)
         VALUES (?, ?, ?)`,
        [
          OfficeName,
          OfficeTypeID || null,
          EventID || null
        ]
      );

      const newOfficeId = result.insertId;
      console.log('Office created successfully:', newOfficeId);

      // Assign all heads to this office in the assignment junction table
      if (headIdArray.length > 0) {
        for (const hid of headIdArray) {
          await db.query(
            `INSERT IGNORE INTO office_head_assignments (HeadID, OfficeID) VALUES (?, ?)`,
            [hid, newOfficeId]
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
      // Audit log: record who created the office (if authenticated)
      try {
        const actorId = req.user && req.user.userId;
        if (actorId) {
          const [officeTypeName, eventName, headNames] = await Promise.all([
            getOfficeTypeName(OfficeTypeID),
            getEventName(EventID),
            getNamesByHeadIds(headIdArray),
          ]);

          await recordLog(actorId, 'OfficeAdded', {
            OfficeName,
            OfficeType: officeTypeName,
            EventName: eventName,
            HeadNames: headNames,
            HeadCount: headNames.length
          });

          if (headIdArray.length > 0) {
            const assignedHeadDetails = await getHeadAssignmentDetailsByHeadIds(headIdArray);
            if (assignedHeadDetails.length > 0) {
              await createNotifications({
                userIds: assignedHeadDetails.map((item) => item.userId),
                adminId: actorId,
                title: 'Assigned As Office Personnel',
                message: `You were assigned to office ${OfficeName} under event ${eventName}.`,
                type: 'info',
                relatedTable: 'office_personnel',
                relatedId: Number(newOfficeId),
              });
            }
          }
        }
      } catch (e) {
        console.error('Failed to record office creation log:', e);
      }
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
    const headIdArray = normalizeHeadIds(HeadIDs, HeadID);

    if (headIdArray.length > MAX_HEADS_PER_OFFICE) {
      return res.status(400).json({
        success: false,
        message: `You can assign a maximum of ${MAX_HEADS_PER_OFFICE} heads per office`
      });
    }

    try {
      const previousOffice = await getOfficeSnapshot(id);
      if (!previousOffice) {
        return res.status(404).json({ success: false, message: "Office not found" });
      }

      // Update office info only; heads are managed via office_head_assignments
      const [result] = await db.query(
        `UPDATE offices 
         SET OfficeName = ?, OfficeTypeID = ?, EventID = ?
         WHERE OfficeID = ?`,
        [OfficeName, OfficeTypeID, EventID, id]
      );

      // Remove all existing assignments for this office
      await db.query(
        `DELETE FROM office_head_assignments WHERE OfficeID = ?`,
        [id]
      );

      // Assign all new heads to this office
      if (headIdArray.length > 0) {
        for (const hid of headIdArray) {
          await db.query(
            `INSERT IGNORE INTO office_head_assignments (HeadID, OfficeID) VALUES (?, ?)`,
            [hid, id]
          );
        }
        console.log('Updated heads for office', id, ':', headIdArray);
      }

      // Audit log: record who updated the office (if authenticated)
      try {
        const actorId = req.user && req.user.userId;
        if (actorId) {
          const [officeTypeName, eventName, currentHeadNames] = await Promise.all([
            getOfficeTypeName(OfficeTypeID),
            getEventName(EventID),
            getNamesByHeadIds(headIdArray),
          ]);

          const previousHeadIdSet = new Set((previousOffice.HeadIDs || []).map((value) => Number(value)));
          const currentHeadIdSet = new Set((headIdArray || []).map((value) => Number(value)));

          const addedHeadIds = [...currentHeadIdSet].filter((headId) => !previousHeadIdSet.has(headId));
          const removedHeadIds = [...previousHeadIdSet].filter((headId) => !currentHeadIdSet.has(headId));
          const [addedHeadNames, removedHeadNames] = await Promise.all([
            getNamesByHeadIds(addedHeadIds),
            getNamesByHeadIds(removedHeadIds),
          ]);

          const changes = {};
          if ((previousOffice.OfficeName || '') !== (OfficeName || '')) {
            changes.OfficeName = { from: previousOffice.OfficeName || '', to: OfficeName || '' };
          }
          if ((previousOffice.OfficeTypeName || 'Unassigned') !== (officeTypeName || 'Unassigned')) {
            changes.OfficeType = { from: previousOffice.OfficeTypeName || 'Unassigned', to: officeTypeName || 'Unassigned' };
          }
          if ((previousOffice.EventName || 'No event') !== (eventName || 'No event')) {
            changes.EventName = { from: previousOffice.EventName || 'No event', to: eventName || 'No event' };
          }

          await recordLog(actorId, 'OfficeUpdated', {
            OfficeName,
            OfficeType: officeTypeName,
            EventName: eventName,
            HeadNames: currentHeadNames,
            changes,
            headChanges: {
              added: addedHeadNames,
              removed: removedHeadNames,
            }
          });

          if (addedHeadIds.length > 0) {
            const addedHeadDetails = await getHeadAssignmentDetailsByHeadIds(addedHeadIds);
            if (addedHeadDetails.length > 0) {
              await createNotifications({
                userIds: addedHeadDetails.map((item) => item.userId),
                adminId: actorId,
                title: 'Assigned As Office Personnel',
                message: `You were assigned to office ${OfficeName} under event ${eventName}.`,
                type: 'info',
                relatedTable: 'office_personnel',
                relatedId: Number(id),
              });
            }
          }
        }
      } catch (e) {
        console.error('Failed to record office update log:', e);
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
      const officeToDelete = await getOfficeSnapshot(id);
      if (!officeToDelete) {
        return res.status(404).json({ message: "Office not found" });
      }

      // First, delete all requirements associated with this office
      await db.query("DELETE FROM compliancestatusoffices WHERE OfficeID = ?", [id]);

      // Remove office-head assignments for this office
      await db.query("DELETE FROM office_head_assignments WHERE OfficeID = ?", [id]);

      // Then delete the office
      const [result] = await db.query("DELETE FROM offices WHERE OfficeID = ?", [id]);

      // Audit log: record who deleted the office (if authenticated)
      try {
        const actorId = req.user && req.user.userId;
        if (actorId) {
          await recordLog(actorId, 'OfficeDeleted', {
            OfficeName: officeToDelete.OfficeName,
            OfficeType: officeToDelete.OfficeTypeName || 'Unknown Type',
            EventName: officeToDelete.EventName || 'No event',
            HeadNames: officeToDelete.HeadNames || [],
          });
        }
      } catch (e) {
        console.error('Failed to record office deletion log:', e);
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
          c.ParentCriteriaID,
          c.CriteriaName,
          c.CriteriaCode,
          pc.CriteriaName AS ParentCriteriaName,
          pc.CriteriaCode AS ParentCriteriaCode,
          c.AreaID,
          a.AreaCode,
          a.AreaName,
          cso.Status as ComplianceStatusID,
          cst.StatusName as ComplianceStatus,
          cso.comments
        FROM compliancestatusoffices cso
        INNER JOIN requirements r ON cso.RequirementID = r.RequirementID
        LEFT JOIN criteria c ON r.CriteriaID = c.CriteriaID
        LEFT JOIN criteria pc ON c.ParentCriteriaID = pc.CriteriaID
        LEFT JOIN areas a ON c.AreaID = a.AreaID
        LEFT JOIN compliancestatustypes cst ON cso.Status = cst.StatusID
        WHERE cso.OfficeID = ?
        ORDER BY a.SortOrder ASC, COALESCE(pc.CriteriaCode, c.CriteriaCode) ASC, c.CriteriaCode ASC, r.RequirementCode ASC
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
  // EXPORT OFFICE REQUIREMENTS (EXCEL TABLE FORMAT)
  // ================================
  exportOfficeExcel: async (req, res) => {
    const officeId = Number(req.params.id);

    if (!Number.isInteger(officeId) || officeId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid office id' });
    }

    try {
      const [officeRows] = await db.query(
        `SELECT o.OfficeID, o.OfficeName
         FROM offices o
         WHERE o.OfficeID = ?
         LIMIT 1`,
        [officeId]
      );

      if (!officeRows.length) {
        return res.status(404).json({ success: false, message: 'Office not found' });
      }

      const officeName = officeRows[0].OfficeName || `Office ${officeId}`;

      const [requirementsRows] = await db.query(
        `SELECT
          r.RequirementID,
          r.RequirementCode,
          r.Description,
          c.CriteriaID,
          c.CriteriaCode,
          c.CriteriaName,
          a.AreaID,
          a.AreaCode,
          a.AreaName,
          cso.Status AS ComplianceStatusID,
          cst.StatusName AS ComplianceStatusName
        FROM compliancestatusoffices cso
        INNER JOIN requirements r ON cso.RequirementID = r.RequirementID
        LEFT JOIN criteria c ON r.CriteriaID = c.CriteriaID
        LEFT JOIN areas a ON c.AreaID = a.AreaID
        LEFT JOIN compliancestatustypes cst ON cso.Status = cst.StatusID
        WHERE cso.OfficeID = ?
        ORDER BY
          COALESCE(a.AreaCode, 'ZZZ') ASC,
          COALESCE(a.AreaName, 'ZZZ') ASC,
          COALESCE(c.CriteriaCode, 'ZZZ') ASC,
          COALESCE(r.RequirementCode, 'ZZZ') ASC,
          r.RequirementID ASC`,
        [officeId]
      );

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Compliance Audit';
      workbook.created = new Date();

      const sheet = workbook.addWorksheet('Office Export');
      sheet.columns = [
        { key: 'status', width: 24 },
        { key: 'requirement', width: 72 },
      ];

      const thinBorder = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };

      const areaHeaderStyle = {
        font: { bold: true, size: 13 },
        alignment: { horizontal: 'center', vertical: 'middle' },
      };

      const criteriaHeaderStyle = {
        font: { bold: true, size: 12 },
        alignment: { horizontal: 'left', vertical: 'middle' },
      };

      let rowIndex = 1;

      // Header: OFFICE NAME (merged and bordered)
      sheet.mergeCells(`A${rowIndex}:B${rowIndex}`);
      const officeCell = sheet.getCell(`A${rowIndex}`);
      officeCell.value = String(officeName).toUpperCase();
      officeCell.font = { bold: true, size: 14 };
      officeCell.alignment = { horizontal: 'center', vertical: 'middle' };
      officeCell.border = thinBorder;
      sheet.getCell(`B${rowIndex}`).border = thinBorder;
      rowIndex += 1;

      if (!requirementsRows.length) {
        sheet.mergeCells(`A${rowIndex}:B${rowIndex}`);
        const emptyCell = sheet.getCell(`A${rowIndex}`);
        emptyCell.value = 'No requirements assigned to this office.';
        emptyCell.alignment = { horizontal: 'center', vertical: 'middle' };
        emptyCell.border = thinBorder;
        sheet.getCell(`B${rowIndex}`).border = thinBorder;
      } else {
        const areasMap = new Map();

        requirementsRows.forEach((row) => {
          const areaCode = row.AreaCode || 'N/A';
          const areaName = row.AreaName || 'No Area';
          const areaKey = `${areaCode}__${areaName}`;

          if (!areasMap.has(areaKey)) {
            areasMap.set(areaKey, {
              areaCode,
              areaName,
              criteria: new Map(),
            });
          }

          const areaEntry = areasMap.get(areaKey);
          const criteriaCode = row.CriteriaCode || 'N/A';
          const criteriaName = row.CriteriaName || 'No Criteria';
          const criteriaKey = `${criteriaCode}__${criteriaName}`;

          if (!areaEntry.criteria.has(criteriaKey)) {
            areaEntry.criteria.set(criteriaKey, {
              criteriaCode,
              criteriaName,
              requirements: [],
            });
          }

          areaEntry.criteria.get(criteriaKey).requirements.push({
            status: normalizeComplianceStatus(row.ComplianceStatusID, row.ComplianceStatusName),
            requirementCode: row.RequirementCode || 'N/A',
            description: row.Description || '',
          });
        });

        for (const area of areasMap.values()) {
          // Area title row merged across both columns
          sheet.mergeCells(`A${rowIndex}:B${rowIndex}`);
          const areaTitleCell = sheet.getCell(`A${rowIndex}`);
          areaTitleCell.value = `${area.areaCode} - ${area.areaName}`;
          areaTitleCell.font = areaHeaderStyle.font;
          areaTitleCell.alignment = areaHeaderStyle.alignment;
          areaTitleCell.border = thinBorder;
          sheet.getCell(`B${rowIndex}`).border = thinBorder;
          rowIndex += 1;

          for (const criteria of area.criteria.values()) {
            // Criteria row aligned with requirement text column
            const criteriaCode = String(criteria.criteriaCode || '').trim().replace(/\.+$/, '').toUpperCase();
            const criteriaLabel = criteriaCode
              ? `${criteriaCode}. ${criteria.criteriaName}`
              : String(criteria.criteriaName || 'No Criteria');

            const criteriaLeftCell = sheet.getCell(`A${rowIndex}`);
            const criteriaTitleCell = sheet.getCell(`B${rowIndex}`);

            criteriaLeftCell.value = '';
            criteriaLeftCell.border = thinBorder;

            criteriaTitleCell.value = criteriaLabel;
            criteriaTitleCell.font = criteriaHeaderStyle.font;
            criteriaTitleCell.alignment = criteriaHeaderStyle.alignment;
            criteriaTitleCell.border = thinBorder;
            rowIndex += 1;

            // Requirement rows (2-column table)
            criteria.requirements.forEach((req) => {
              const statusCell = sheet.getCell(`A${rowIndex}`);
              const requirementCell = sheet.getCell(`B${rowIndex}`);

              statusCell.value = req.status;
              requirementCell.value = `${req.requirementCode} - ${req.description}`;

              statusCell.alignment = { horizontal: 'left', vertical: 'middle' };
              requirementCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

              statusCell.border = thinBorder;
              requirementCell.border = thinBorder;
              rowIndex += 1;
            });
          }
        }
      }

      const safeName = String(officeName)
        .replace(/[\\/:*?"<>|]+/g, '_')
        .replace(/\s+/g, '_')
        .trim();

      const fileName = `${safeName || `office_${officeId}`}_export.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

      await workbook.xlsx.write(res);
      return res.end();
    } catch (err) {
      console.error('Error exporting office excel:', err);
      return res.status(500).json({ success: false, message: 'Failed to export office excel', details: err.message });
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

    const normalizedRequirementIds = [...new Set(
      requirementIds
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0)
    )];

    if (normalizedRequirementIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid requirement IDs were provided"
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

      // Detect already-assigned requirements for this office so we can report duplicate skips.
      const [existingRows] = await db.query(
        `SELECT RequirementID FROM compliancestatusoffices WHERE OfficeID = ? AND RequirementID IN (?)`,
        [officeId, normalizedRequirementIds]
      );

      const existingSet = new Set(existingRows.map((row) => Number(row.RequirementID)));
      const newRequirementIds = normalizedRequirementIds.filter((id) => !existingSet.has(id));
      const duplicateCount = normalizedRequirementIds.length - newRequirementIds.length;

      if (newRequirementIds.length > 0) {
        const values = newRequirementIds.map((reqId) => [officeId, reqId, 3]); // Default status: 3 = Not Complied
        await db.query(
          `INSERT INTO compliancestatusoffices (OfficeID, RequirementID, Status) VALUES ?`,
          [values]
        );
      }

      // Update the overall office status
      await updateOverallOfficeStatus(officeId);

      const addedCount = newRequirementIds.length;
      const message = `${duplicateCount} duplicate(s) already assigned, ${addedCount} new requirement(s) added.`;

      res.json({ 
        success: true, 
        message,
        requestedCount: normalizedRequirementIds.length,
        addedCount,
        duplicateCount,
        data: {
          requestedCount: normalizedRequirementIds.length,
          addedCount,
          duplicateCount
        }
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

    // Determine overall status based on requirement composition (same rule as dashboard cards)
    let overallStatus = 'Not Complied';
    if (total > 0 && complied === total) {
      overallStatus = 'Complied';
    } else if (total > 0 && notComplied === total) {
      overallStatus = 'Not Complied';
    } else if (total > 0) {
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
