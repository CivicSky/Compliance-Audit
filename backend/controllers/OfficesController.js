const db = require("../db");
const ExcelJS = require("exceljs");
const { recordLog } = require('./logsController');
const { createNotifications } = require('../utils/notificationService');
const { autoAssignHeadsToRequirementsForOffice } = require('./RequirementsController');
const fs = require('fs');
const path = require('path');
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
          COALESCE(m.entity_name, o.OfficeName) AS OfficeName,
          o.master_list_id,
          o.OfficeTypeID,
          o.EventID,
          o.event_department_id,
          ed.accreditation_level,
          m.entity_type_id,
          m.department_id,
          COALESCE(o.created_at, m.created_at) AS created_at,
          COALESCE(o.updated_at, m.updated_at, o.created_at, m.created_at) AS updated_at,
          COALESCE(d.name, NULL) AS department_name,
          CASE m.entity_type_id
            WHEN 1 THEN 'Academic Program'
            WHEN 2 THEN 'Non-Academic Office'
            ELSE 'Unknown'
          END AS category_name,
          e.EventName,
          e.EventCode,
          ot.TypeName,
          os.OverallStatus,
          os.CompliancePercent,
          os.TotalRequirements,
          os.CompliedCount,
          os.PartiallyCompliedCount,
          os.NotCompliedCount
        FROM offices o
        LEFT JOIN master_list m ON o.master_list_id = m.id
        LEFT JOIN departments d ON m.department_id = d.id
        LEFT JOIN event_departments ed ON o.event_department_id = ed.id
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

      // Get all auditors assigned to offices via auditor_area_assignments junction
      let auditorRows = [];
      try {
        const [auds] = await db.query(`
          SELECT DISTINCT 
            o.OfficeID,
            u.UserID,
            u.FirstName,
            u.MiddleInitial,
            u.LastName,
            u.ProfilePic,
            ar.AreaCode,
            ar.AreaName
          FROM auditor_area_assignments aaa
          JOIN users u ON aaa.auditor_user_id = u.UserID
          JOIN areas ar ON aaa.area_id = ar.AreaID
          JOIN offices o ON o.EventID = ar.EventID
        `);
        auditorRows = auds;
      } catch (audErr) {
        // auditor_area_assignments may not exist or be empty
      }

      const auditorsByOffice = {};
      const seenAuditorsByOffice = {};
      auditorRows.forEach(aud => {
        if (!auditorsByOffice[aud.OfficeID]) {
          auditorsByOffice[aud.OfficeID] = [];
          seenAuditorsByOffice[aud.OfficeID] = new Set();
        }
        if (seenAuditorsByOffice[aud.OfficeID].has(aud.UserID)) return;
        seenAuditorsByOffice[aud.OfficeID].add(aud.UserID);
        auditorsByOffice[aud.OfficeID].push({
          UserID: aud.UserID,
          FirstName: aud.FirstName,
          MiddleInitial: aud.MiddleInitial,
          LastName: aud.LastName,
          ProfilePic: aud.ProfilePic,
          full_name: aud.FirstName ? `${aud.FirstName} ${aud.MiddleInitial ? aud.MiddleInitial + '.' : ''} ${aud.LastName}`.trim() : 'Auditor'
        });
      });

      const formatted = officeRows.map(r => {
        const officeHeads = headsByOffice[r.OfficeID] || [];
        const officeAuditors = auditorsByOffice[r.OfficeID] || [];
        // For backward compatibility, also include primary head info
        const primaryHead = officeHeads[0] || null;
        
        return {
          id: r.OfficeID,
          office_name: r.OfficeName,
          OfficeName: r.OfficeName,
          master_list_id: r.master_list_id || null,
          created_at: r.created_at || null,
          updated_at: r.updated_at || null,
          office_type_id: r.OfficeTypeID,
          office_type_name: r.TypeName || "Unknown Type",
          department_id: r.department_id || null,
          department_name: r.department_name || null,
          event_department_id: r.event_department_id || null,
          accreditation_level: r.accreditation_level || null,
          entity_type_id: r.entity_type_id || null,
          category_name: r.category_name || null,
          head_id: primaryHead?.HeadID || null,
          head_ids: officeHeads.map(h => h.HeadID), // Array of head IDs
          heads: officeHeads, // Full head objects
          head_name: officeHeads.length > 0 
            ? officeHeads.map(h => h.full_name).join(', ')
            : "Unassigned",
          head_profile_pic: primaryHead?.ProfilePic || null,
          auditors: officeAuditors,
          auditor_name: officeAuditors.length > 0
            ? officeAuditors.map(a => a.full_name).join(', ')
            : null,
          event_id: r.EventID,
          event_name: r.EventName || null,
          EventName: r.EventName || null,
          event_code: r.EventCode || r.EventName || null,
          EventCode: r.EventCode || r.EventName || null,
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
          COALESCE(m.entity_name, o.OfficeName) AS OfficeName,
          o.master_list_id,
          o.OfficeTypeID,
          o.EventID,
          m.entity_type_id,
          m.department_id,
          COALESCE(o.created_at, m.created_at) AS created_at,
          COALESCE(o.updated_at, m.updated_at, o.created_at, m.created_at) AS updated_at,
          COALESCE(d.name, NULL) AS department_name,
          CASE m.entity_type_id
            WHEN 1 THEN 'Academic Program'
            WHEN 2 THEN 'Non-Academic Office'
            ELSE 'Unknown'
          END AS category_name,
          t.TypeName,
          os.OverallStatus,
          os.CompliancePercent,
          os.TotalRequirements,
          e.EventName,
          e.EventCode
        FROM offices o
        LEFT JOIN master_list m ON o.master_list_id = m.id
        LEFT JOIN departments d ON m.department_id = d.id
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
        master_list_id: r.master_list_id || null,
        created_at: r.created_at || null,
        updated_at: r.updated_at || null,
        OfficeTypeID: r.OfficeTypeID,
        TypeName: r.TypeName || "Unknown Type",
        DepartmentID: r.department_id || null,
        DepartmentName: r.department_name || null,
        entity_type_id: r.entity_type_id || null,
        category_name: r.category_name || null,
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
  // CREATE NEW OFFICE (SUPPORTS MULTIPLE HEADS & MASTER LIST LINK)
  // ================================
  create: async (req, res) => {
    const { master_list_id, OfficeName, OfficeTypeID, HeadID, HeadIDs, EventID } = req.body;

    // Support both single HeadID (legacy) and HeadIDs array (new)
    const headIdArray = normalizeHeadIds(HeadIDs, HeadID);

    if (headIdArray.length > MAX_HEADS_PER_OFFICE) {
      return res.status(400).json({
        success: false,
        message: `You can assign a maximum of ${MAX_HEADS_PER_OFFICE} heads per office`
      });
    }

    let nameToSave = OfficeName;
    let typeIdToSave = OfficeTypeID;
    let eventDeptId = req.body.event_department_id ? Number(req.body.event_department_id) : null;

    if (master_list_id) {
      const [mlRows] = await db.query('SELECT entity_type_id, entity_name, department_id FROM master_list WHERE id = ?', [master_list_id]);
      if (mlRows.length > 0) {
        nameToSave = mlRows[0].entity_name;
        if (!typeIdToSave) {
          const isAcademic = mlRows[0].entity_type_id === 1;
          const [typeRows] = await db.query(
            'SELECT OfficeTypeID FROM officetypes WHERE LOWER(TypeName) LIKE ? LIMIT 1',
            [isAcademic ? '%academic%' : '%non%']
          );
          typeIdToSave = typeRows[0]?.OfficeTypeID || (isAcademic ? 2 : 1);
        }

        // Link academic program to event_departments
        if (mlRows[0].entity_type_id === 1 && mlRows[0].department_id && EventID) {
          if (!eventDeptId) {
            const reqLevel = req.body.accreditation_level || 'Level I';
            const [existingEd] = await db.query(
              'SELECT id FROM event_departments WHERE event_id = ? AND department_id = ? LIMIT 1',
              [EventID, mlRows[0].department_id]
            );
            if (existingEd.length > 0) {
              eventDeptId = existingEd[0].id;
              if (req.body.accreditation_level) {
                await db.query('UPDATE event_departments SET accreditation_level = ? WHERE id = ?', [req.body.accreditation_level, eventDeptId]);
              }
            } else {
              const [newEd] = await db.query(
                'INSERT INTO event_departments (event_id, department_id, accreditation_level) VALUES (?, ?, ?) RETURNING id',
                [EventID, mlRows[0].department_id, reqLevel]
              );
              eventDeptId = newEd[0]?.id || newEd.insertId;
            }
          }
        }
      }
    }

    console.log('Received create office request:', { master_list_id, OfficeName: nameToSave, OfficeTypeID: typeIdToSave, headIdArray, EventID, eventDeptId });

    try {
      const [result] = await db.query(
        `INSERT INTO offices (OfficeName, master_list_id, OfficeTypeID, EventID, event_department_id)
         VALUES (?, ?, ?, ?, ?)`,
        [
          nameToSave || '',
          master_list_id ? Number(master_list_id) : null,
          typeIdToSave || null,
          EventID || null,
          eventDeptId || null
        ]
      );


      const newOfficeId = result.insertId;
      console.log('Office created successfully:', newOfficeId);

      if (headIdArray.length > 0) {
        for (const hid of headIdArray) {
          await db.query(
            `INSERT INTO office_head_assignments (HeadID, OfficeID) VALUES (?, ?) ON CONFLICT DO NOTHING`,
            [hid, newOfficeId]
          );
        }
        console.log('Assigned heads to office:', headIdArray);
      }

      await updateOverallOfficeStatus(newOfficeId);

      res.json({
        success: true,
        message: 'Office created successfully',
        data: {
          OfficeID: newOfficeId,
          OfficeName: nameToSave,
          master_list_id: master_list_id ? Number(master_list_id) : null,
          OfficeTypeID,
          HeadIDs: headIdArray,
          EventID
        }
      });
      // Audit log
      try {
        const actorId = req.user && req.user.userId;
        if (actorId) {
          const [officeTypeName, eventName, headNames] = await Promise.all([
            getOfficeTypeName(OfficeTypeID),
            getEventName(EventID),
            getNamesByHeadIds(headIdArray),
          ]);

          await recordLog(actorId, 'OfficeAdded', {
            OfficeName: nameToSave,
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
                message: `You were assigned to office ${nameToSave} under event ${eventName}.`,
                type: 'info',
                relatedTable: 'office_personnel',
                relatedId: Number(newOfficeId),
                meta: { officeId: Number(newOfficeId) },
              });
            }
            try {
              const [reqRows] = await db.query('SELECT RequirementID FROM compliancestatusoffices WHERE OfficeID = ?', [newOfficeId]);
              const reqIds = reqRows.map(r => Number(r.RequirementID)).filter(id => Number.isInteger(id) && id > 0);
              if (reqIds.length > 0) {
                await autoAssignHeadsToRequirementsForOffice(newOfficeId, reqIds, actorId);
              }
            } catch (e) {
              console.error('Auto-assign heads on office create failed:', e);
            }
          }
        }
      } catch (e) {
        console.error('Failed to record office creation log:', e);
      }
    } catch (err) {
      console.error("Error creating office:", err);
      res.status(500).json({ 
        success: false, 
        error: "Database error", 
        details: err.message 
      });
    }
  },

  // ================================
  // UPDATE OFFICE (SUPPORTS MULTIPLE HEADS & MASTER LIST LINK)
  // ================================
  update: async (req, res) => {
    const id = req.params.id;
    const { master_list_id, OfficeName, OfficeTypeID, HeadID, HeadIDs, EventID } = req.body;

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

      let nameToSave = OfficeName;
      if (!nameToSave && master_list_id) {
        const [mlRows] = await db.query('SELECT entity_name FROM master_list WHERE id = ?', [master_list_id]);
        if (mlRows.length > 0) {
          nameToSave = mlRows[0].entity_name;
        }
      }

      if (nameToSave && master_list_id) {
        await db.query('UPDATE master_list SET entity_name = ? WHERE id = ?', [nameToSave, master_list_id]);
      }

      const [result] = await db.query(
        `UPDATE offices 
         SET OfficeName = ?, master_list_id = ?, OfficeTypeID = ?, EventID = ?
         WHERE OfficeID = ?`,
        [
          nameToSave || previousOffice.OfficeName || '',
          master_list_id ? Number(master_list_id) : null,
          OfficeTypeID,
          EventID,
          id
        ]
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
            `INSERT INTO office_head_assignments (HeadID, OfficeID) VALUES (?, ?) ON CONFLICT DO NOTHING`,
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

          // If some heads were removed from this office, cleanup any requirement assignments
          // that referred to those users within this office.
          if (removedHeadIds.length > 0) {
            try {
              const placeholders = removedHeadIds.map(() => '?').join(',');
              const [headRows] = await db.query(
                `SELECT HeadID, UserID FROM headofoffice WHERE HeadID IN (${placeholders})`,
                removedHeadIds
              );

              const userIds = headRows.map(r => r.UserID).filter(id => Number.isInteger(Number(id)));
              if (userIds.length > 0) {
                const userPlaceholders = userIds.map(() => '?').join(',');
                // Delete any requirement_user_assignments scoped to this office for those users
                await db.query(
                  `DELETE FROM requirement_user_assignments WHERE UserID IN (${userPlaceholders}) AND OfficeID = ?`,
                  [...userIds, id]
                );
              }
            } catch (cleanupErr) {
              console.error('Failed to cleanup requirement_user_assignments for removed office heads:', cleanupErr);
            }
          }

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
                meta: { officeId: Number(id) },
              });
            }
            // Auto-assign newly added heads to existing requirements for this office
            try {
              const [reqRows] = await db.query('SELECT RequirementID FROM compliancestatusoffices WHERE OfficeID = ?', [id]);
              const reqIds = reqRows.map(r => Number(r.RequirementID)).filter(id2 => Number.isInteger(id2) && id2 > 0);
              if (reqIds.length > 0) {
                await autoAssignHeadsToRequirementsForOffice(id, reqIds, actorId);
              }
            } catch (e) {
              console.error('Auto-assign heads on office update failed:', e);
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

      // Before deleting requirements, cleanup uploaded files related to this office
      try {
        // 1) Find requirement IDs linked to this office
        const [reqRows] = await db.query('SELECT RequirementID FROM compliancestatusoffices WHERE OfficeID = ?', [id]);
        console.log('Office delete: found requirement IDs for office', id, reqRows.map(r => r.RequirementID));
        const requirementIds = Array.isArray(reqRows) ? reqRows.map(r => Number(r.RequirementID)).filter(n => Number.isInteger(n)) : [];

        if (requirementIds.length > 0) {
          const placeholders = requirementIds.map(() => '?').join(',');

          // Delete any proof documents attached to these requirements (disk + DB)
          try {
            const [proofFiles] = await db.query(
              `SELECT id, file_path FROM office_proof_documents WHERE requirement_id IN (${placeholders})`,
              requirementIds
            );
            console.log('Office delete: found proofFiles for requirements:', (proofFiles || []).length);
            if (proofFiles && proofFiles.length > 0) {
              for (const f of proofFiles) {
                try {
                  const absPath = path.join(__dirname, '..', (f.file_path || '').replace(/^\//, ''));
                  const exists = fs.existsSync(absPath);
                  console.log('Attempting delete proof file:', absPath, 'exists=', exists);
                  if (exists) {
                    fs.unlinkSync(absPath);
                    console.log('Deleted proof file:', absPath);
                  } else {
                    console.warn('Proof file not found on disk:', absPath);
                  }
                } catch (fsErr) {
                  console.warn('Failed to delete office proof file during office deletion:', fsErr);
                }
              }
              const [delRes] = await db.query(`DELETE FROM office_proof_documents WHERE requirement_id IN (${placeholders})`, requirementIds);
              console.log('Deleted proof DB rows count:', delRes.affectedRows || 0);
            }
          } catch (e) {
            console.error('Error cleaning up proof documents for requirements during office delete:', e);
          }

          // Delete any user-uploaded requirement files (disk + DB)
          try {
            const [userFiles] = await db.query(
              `SELECT id, file_path FROM requirement_user_uploads WHERE requirement_id IN (${placeholders})`,
              requirementIds
            );
            console.log('Office delete: found requirement_user_uploads count:', (userFiles || []).length);
            if (userFiles && userFiles.length > 0) {
              for (const uf of userFiles) {
                try {
                  const absPath = path.join(__dirname, '..', (uf.file_path || '').replace(/^\//, ''));
                  const exists = fs.existsSync(absPath);
                  console.log('Attempting delete user upload:', absPath, 'exists=', exists);
                  if (exists) {
                    fs.unlinkSync(absPath);
                    console.log('Deleted user upload:', absPath);
                  } else {
                    console.warn('User upload file not found on disk:', absPath);
                  }
                } catch (fsErr) {
                  console.warn('Failed to delete user requirement upload during office deletion:', fsErr);
                }
              }
              const [delUserRes] = await db.query(`DELETE FROM requirement_user_uploads WHERE requirement_id IN (${placeholders})`, requirementIds);
              console.log('Deleted requirement_user_uploads DB rows count:', delUserRes.affectedRows || 0);
            }
          } catch (e) {
            console.error('Error cleaning up requirement_user_uploads during office delete:', e);
          }

          // Remove any requirement_user_assignments for these requirements scoped to this office
          try {
            await db.query(
              `DELETE FROM requirement_user_assignments WHERE RequirementID IN (${placeholders}) AND OfficeID = ?`,
              [...requirementIds, id]
            );
          } catch (e) {
            console.error('Error cleaning up requirement_user_assignments during office delete:', e);
          }
        }

        // 2) Remove any office-level proof documents (requirement_id IS NULL) for this office (disk + DB)
        try {
          const [officeProofs] = await db.query('SELECT id, file_path FROM office_proof_documents WHERE office_id = ? AND requirement_id IS NULL', [id]);
          if (officeProofs && officeProofs.length > 0) {
            for (const f of officeProofs) {
              try {
                const absPath = path.join(__dirname, '..', (f.file_path || '').replace(/^\//, ''));
                if (fs.existsSync(absPath)) fs.unlinkSync(absPath);
              } catch (fsErr) {
                console.warn('Failed to delete office-level proof file during office deletion:', fsErr);
              }
            }
            await db.query('DELETE FROM office_proof_documents WHERE office_id = ? AND requirement_id IS NULL', [id]);
          }
        } catch (e) {
          console.error('Error cleaning up office-level proof documents during office delete:', e);
        }
      } catch (e) {
        console.error('Error during uploaded files cleanup before deleting office:', e);
      }

      // Then delete all requirements associated with this office
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

  deleteMultiple: async (req, res) => {
    try {
      const rawIds = req.body?.ids || req.body?.officeIds || req.body?.data?.ids || [];
      const ids = Array.isArray(rawIds) ? rawIds.map(Number).filter(n => Number.isInteger(n) && n > 0) : [];
      if (ids.length === 0) {
        return res.status(400).json({ success: false, message: 'No valid office IDs provided' });
      }

      const placeholders = ids.map(() => '?').join(',');

      try {
        await db.query(`DELETE FROM requirement_user_uploads WHERE requirement_id IN (SELECT RequirementID FROM compliancestatusoffices WHERE OfficeID IN (${placeholders}))`, ids);
        await db.query(`DELETE FROM office_proof_documents WHERE office_id IN (${placeholders})`, ids);
        await db.query(`DELETE FROM requirement_user_assignments WHERE OfficeID IN (${placeholders})`, ids);
        await db.query(`DELETE FROM compliancestatusoffices WHERE OfficeID IN (${placeholders})`, ids);
        await db.query(`DELETE FROM office_head_assignments WHERE OfficeID IN (${placeholders})`, ids);
        await db.query(`DELETE FROM OverallOfficeStatus WHERE OfficeID IN (${placeholders})`, ids);
      } catch (e) {
        console.warn('Cleanup child records warning during bulk office delete:', e.message);
      }

      const [result] = await db.query(`DELETE FROM offices WHERE OfficeID IN (${placeholders})`, ids);

      return res.json({
        success: true,
        message: `Successfully deleted ${result.affectedRows || ids.length} office(s)`,
        deletedCount: result.affectedRows || ids.length
      });
    } catch (err) {
      console.error('Error bulk deleting offices:', err);
      return res.status(500).json({ success: false, message: 'Failed to delete selected offices', error: err.message });
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
          c.ParentCriteriaID,
          c.CriteriaCode,
          c.CriteriaName,
          pc.CriteriaCode AS ParentCriteriaCode,
          pc.CriteriaName AS ParentCriteriaName,
          a.AreaID,
          a.AreaCode,
          a.AreaName,
          cso.Status AS ComplianceStatusID,
          cst.StatusName AS ComplianceStatusName,
          cso.comments AS Comments
        FROM compliancestatusoffices cso
        INNER JOIN requirements r ON cso.RequirementID = r.RequirementID
        LEFT JOIN criteria c ON r.CriteriaID = c.CriteriaID
        LEFT JOIN criteria pc ON c.ParentCriteriaID = pc.CriteriaID
        LEFT JOIN areas a ON c.AreaID = a.AreaID
        LEFT JOIN compliancestatustypes cst ON cso.Status = cst.StatusID
        WHERE cso.OfficeID = ?
        ORDER BY
          COALESCE(a.AreaCode, 'ZZZ') ASC,
          COALESCE(a.AreaName, 'ZZZ') ASC,
          COALESCE(COALESCE(pc.CriteriaCode, c.CriteriaCode), 'ZZZ') ASC,
          COALESCE(c.CriteriaCode, 'ZZZ') ASC,
          COALESCE(r.RequirementCode, 'ZZZ') ASC,
          r.RequirementID ASC`,
        [officeId]
      );

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Compliance Audit';
      workbook.created = new Date();

      const sheet = workbook.addWorksheet('Office Export');
      // Increase column widths to avoid truncation of long criteria/requirement titles.
      // Do not set any row heights here so the client can auto-size rows as needed.
      sheet.columns = [
        { key: 'status', width: 20 },
        { key: 'requirement', width: 140 },
        { key: 'comments', width: 64 },
      ];

      const thinBorder = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };

      // Enable wrapText on headers so long titles can flow onto multiple lines
      // while keeping row heights uncontrolled (no explicit height set).
      const areaHeaderStyle = {
        font: { bold: true, size: 13 },
        alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
      };

      const criteriaHeaderStyle = {
        font: { bold: true, size: 12 },
        alignment: { horizontal: 'left', vertical: 'middle', wrapText: true },
      };

      let rowIndex = 1;

      // Header: OFFICE NAME (merged and bordered)
      sheet.mergeCells(`A${rowIndex}:C${rowIndex}`);
      const officeCell = sheet.getCell(`A${rowIndex}`);
      officeCell.value = String(officeName).toUpperCase();
      officeCell.font = { bold: true, size: 14 };
      officeCell.alignment = { horizontal: 'center', vertical: 'middle' };
      officeCell.border = thinBorder;
      sheet.getCell(`B${rowIndex}`).border = thinBorder;
      sheet.getCell(`C${rowIndex}`).border = thinBorder;
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

        // Build criteria nodes with parent relationships per area
        requirementsRows.forEach((row) => {
          const areaCode = row.AreaCode || 'N/A';
          const areaName = row.AreaName || 'No Area';
          const areaKey = `${areaCode}__${areaName}`;

          if (!areasMap.has(areaKey)) {
            areasMap.set(areaKey, {
              areaCode,
              areaName,
              criteriaMap: new Map(),
            });
          }

          const areaEntry = areasMap.get(areaKey);

          const critId = row.CriteriaID != null ? Number(row.CriteriaID) : `req_${row.RequirementID}`;
          const parentId = row.ParentCriteriaID != null ? Number(row.ParentCriteriaID) : null;

          if (!areaEntry.criteriaMap.has(critId)) {
            areaEntry.criteriaMap.set(critId, {
              id: critId,
              code: row.CriteriaCode || '',
              name: row.CriteriaName || '',
              parentId: parentId,
              children: [],
              requirements: [],
            });
          }

          // If parent exists in this row but parent node not yet created, synthesize parent node placeholder
          if (parentId && !areaEntry.criteriaMap.has(parentId)) {
            areaEntry.criteriaMap.set(parentId, {
              id: parentId,
              code: row.ParentCriteriaCode || '',
              name: row.ParentCriteriaName || '',
              parentId: null,
              children: [],
              requirements: [],
            });
          }

          areaEntry.criteriaMap.get(critId).requirements.push({
            status: normalizeComplianceStatus(row.ComplianceStatusID, row.ComplianceStatusName),
            requirementCode: row.RequirementCode || 'N/A',
            description: row.Description || '',
            comments: row.Comments || ''
          });
        });

        // Link children to their parents per area
        for (const area of areasMap.values()) {
          for (const node of area.criteriaMap.values()) {
            if (node.parentId && area.criteriaMap.has(node.parentId)) {
              area.criteriaMap.get(node.parentId).children.push(node);
            }
          }
        }

        // Write areas and nested criteria -> child criteria -> requirements
        for (const area of areasMap.values()) {
          // Area title row merged across three columns
          sheet.mergeCells(`A${rowIndex}:C${rowIndex}`);
          const areaTitleCell = sheet.getCell(`A${rowIndex}`);
          areaTitleCell.value = `${area.areaCode} - ${area.areaName}`;
          areaTitleCell.font = areaHeaderStyle.font;
          areaTitleCell.alignment = areaHeaderStyle.alignment;
          areaTitleCell.border = thinBorder;
          sheet.getCell(`B${rowIndex}`).border = thinBorder;
          sheet.getCell(`C${rowIndex}`).border = thinBorder;
          rowIndex += 1;

          // Determine root criteria (those without parent or whose parent is not in the same map)
          const allNodes = Array.from(area.criteriaMap.values());
          const roots = allNodes.filter(n => !n.parentId || !area.criteriaMap.has(n.parentId));

          // Sort roots by code then name
          roots.sort((a, b) => (String(a.code || a.name)).localeCompare(String(b.code || b.name)));

          for (const root of roots) {
            // Criteria header (root)
            sheet.mergeCells(`A${rowIndex}:C${rowIndex}`);
            const criteriaLabel = root.code ? `${String(root.code).trim().replace(/\.+$/, '').toUpperCase()}. ${root.name}` : root.name || 'No Criteria';
            const criteriaCell = sheet.getCell(`A${rowIndex}`);
            criteriaCell.value = criteriaLabel;
            criteriaCell.font = criteriaHeaderStyle.font;
            criteriaCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
            criteriaCell.border = thinBorder;
            sheet.getCell(`B${rowIndex}`).border = thinBorder;
            sheet.getCell(`C${rowIndex}`).border = thinBorder;
            rowIndex += 1;

            // Write requirements directly under root (if any)
            for (const req of root.requirements) {
              sheet.getCell(`A${rowIndex}`).value = req.status;
              sheet.getCell(`B${rowIndex}`).value = `${req.requirementCode} - ${req.description}`;
              sheet.getCell(`C${rowIndex}`).value = req.comments || '';
              sheet.getCell(`A${rowIndex}`).alignment = { horizontal: 'left', vertical: 'middle' };
              sheet.getCell(`B${rowIndex}`).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
              sheet.getCell(`C${rowIndex}`).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
              sheet.getCell(`A${rowIndex}`).border = thinBorder;
              sheet.getCell(`B${rowIndex}`).border = thinBorder;
              sheet.getCell(`C${rowIndex}`).border = thinBorder;
              rowIndex += 1;
            }

            // For each child criteria under this root
            const children = (root.children || []).slice().sort((a,b) => (String(a.code || a.name)).localeCompare(String(b.code || b.name)));
            for (const child of children) {
              // Child header merged
              sheet.mergeCells(`A${rowIndex}:C${rowIndex}`);
              const childLabel = child.code ? `${String(child.code).trim().replace(/\.+$/, '').toUpperCase()}. ${child.name}` : child.name || 'No Criteria';
              const childCell = sheet.getCell(`A${rowIndex}`);
              childCell.value = childLabel;
              childCell.font = { bold: true, size: 11 };
              childCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
              childCell.border = thinBorder;
              sheet.getCell(`B${rowIndex}`).border = thinBorder;
              sheet.getCell(`C${rowIndex}`).border = thinBorder;
              rowIndex += 1;

              for (const req of child.requirements) {
                sheet.getCell(`A${rowIndex}`).value = req.status;
                sheet.getCell(`B${rowIndex}`).value = `${req.requirementCode} - ${req.description}`;
                sheet.getCell(`C${rowIndex}`).value = req.comments || '';
                sheet.getCell(`A${rowIndex}`).alignment = { horizontal: 'left', vertical: 'middle' };
                sheet.getCell(`B${rowIndex}`).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
                sheet.getCell(`C${rowIndex}`).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
                sheet.getCell(`A${rowIndex}`).border = thinBorder;
                sheet.getCell(`B${rowIndex}`).border = thinBorder;
                sheet.getCell(`C${rowIndex}`).border = thinBorder;
                rowIndex += 1;
              }
            }
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
        `SELECT RequirementID FROM compliancestatusoffices WHERE OfficeID = ? AND RequirementID IN (${normalizedRequirementIds.join(',')})`,
        [officeId]
      );

      const existingSet = new Set(existingRows.map((row) => Number(row.RequirementID ?? row.requirementid)));
      const newRequirementIds = normalizedRequirementIds.filter((id) => !existingSet.has(id));
      const duplicateCount = normalizedRequirementIds.length - newRequirementIds.length;

      if (newRequirementIds.length > 0) {
        const valuesSql = newRequirementIds.map((reqId) => `(${Number(officeId)}, ${Number(reqId)}, 3)`).join(',');
        await db.query(
          `INSERT INTO compliancestatusoffices (OfficeID, RequirementID, Status) VALUES ${valuesSql}`
        );

        // Auto-assign current office heads to the newly-added requirements
        try {
          const actorId = req.user && req.user.userId;
          await autoAssignHeadsToRequirementsForOffice(officeId, newRequirementIds, actorId);
        } catch (e) {
          console.error('Auto-assign heads on addOfficeRequirements failed:', e);
        }
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

      // Remove any user assignments for this requirement in this office
      try {
        await db.execute('DELETE FROM requirement_user_assignments WHERE RequirementID = ? AND OfficeID = ?', [requirementId, officeId]);
      } catch (cleanupErr) {
        console.error('Failed to cleanup requirement_user_assignments after removing office requirement:', cleanupErr);
      }

      // Also remove any uploaded proof documents (disk + DB) related to this requirement for the office
      try {
        const [files] = await db.query(
          'SELECT id, file_path FROM office_proof_documents WHERE requirement_id = ? AND office_id = ?',
          [requirementId, officeId]
        );

        if (files && files.length > 0) {
          for (const f of files) {
            try {
              const absPath = path.join(__dirname, '..', (f.file_path || '').replace(/^\//, ''));
              if (fs.existsSync(absPath)) {
                fs.unlinkSync(absPath);
              }
            } catch (fsErr) {
              console.warn('Failed to delete requirement proof file from disk during removeOfficeRequirement:', fsErr);
            }
          }

          await db.query('DELETE FROM office_proof_documents WHERE requirement_id = ? AND office_id = ?', [requirementId, officeId]);
        }
      } catch (docErr) {
        console.error('Failed to cleanup office_proof_documents after removing office requirement:', docErr);
      }

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
    const nextStatusId = Number(statusId);

    if (!nextStatusId || ![3, 4, 5].includes(nextStatusId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be 3 (Not Complied), 4 (Partially Complied), or 5 (Complied)"
      });
    }

    try {
      // Check existing status to see if statusId is changing or being set
      const [existingStatusRows] = await db.query(
        `SELECT Status FROM compliancestatusoffices WHERE OfficeID = ? AND RequirementID = ?`,
        [officeId, requirementId]
      );
      const currentStatus = existingStatusRows[0]?.Status;

      // If status is being set or changed, ensure evidence exists
      if (nextStatusId && nextStatusId !== Number(currentStatus)) {
        const [userUploads] = await db.query(
          `SELECT COUNT(*) as cnt FROM requirement_user_assignments 
           WHERE OfficeID = ? AND RequirementID = ? AND HasUploaded = TRUE`,
          [officeId, requirementId]
        );
        const [proofDocs] = await db.query(
          `SELECT COUNT(*) as cnt FROM office_proof_documents 
           WHERE office_id = ? AND (requirement_id = ? OR requirement_id IS NULL)`,
          [officeId, requirementId]
        );

        const hasEvidence = (userUploads[0]?.cnt > 0) || (proofDocs[0]?.cnt > 0);

        if (!hasEvidence) {
          return res.status(400).json({
            success: false,
            message: "Cannot change compliance status: No evidence or proof document has been uploaded for this requirement yet."
          });
        }
      }

      const hasCommentPayload = Object.prototype.hasOwnProperty.call(req.body, 'comments');
      const updateSql = hasCommentPayload
        ? `UPDATE compliancestatusoffices
           SET Status = ?, comments = ?, LastUpdated = CURRENT_TIMESTAMP
           WHERE OfficeID = ? AND RequirementID = ?`
        : `UPDATE compliancestatusoffices
           SET Status = ?, LastUpdated = CURRENT_TIMESTAMP
           WHERE OfficeID = ? AND RequirementID = ?`;
      const updateParams = hasCommentPayload
        ? [nextStatusId, comments || null, officeId, requirementId]
        : [nextStatusId, officeId, requirementId];
      const [updateResult] = await db.query(updateSql, updateParams);

      if (!updateResult?.affectedRows) {
        await db.query(
          `INSERT INTO compliancestatusoffices (OfficeID, RequirementID, Status, comments)
           VALUES (?, ?, ?, ?)`,
          [officeId, requirementId, nextStatusId, hasCommentPayload ? (comments || null) : null]
        );
      }

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
          c.ParentCriteriaID,
          c.CriteriaCode,
          c.CriteriaName,
          pc.CriteriaCode AS ParentCriteriaCode,
          pc.CriteriaName AS ParentCriteriaName,
          r.AreaID AS AreaID,
          a.AreaCode,
          a.AreaName,
          cso.Status AS ComplianceStatusID,
          cst.StatusName AS ComplianceStatusName,
          cso.comments AS Comments
        FROM compliancestatusoffices cso
        INNER JOIN requirements r ON cso.RequirementID = r.RequirementID
        LEFT JOIN criteria c ON r.CriteriaID = c.CriteriaID
        LEFT JOIN criteria pc ON c.ParentCriteriaID = pc.CriteriaID
        LEFT JOIN areas a ON r.AreaID = a.AreaID
        LEFT JOIN compliancestatustypes cst ON cso.Status = cst.StatusID
        WHERE cso.OfficeID = ?
        ORDER BY
          r.RequirementID ASC`,
        [officeId]
      );

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Compliance Audit';
      workbook.created = new Date();

      const sheet = workbook.addWorksheet('Office Export');
      sheet.columns = [
        { key: 'status', width: 20 },
        { key: 'requirement', width: 140 },
        { key: 'comments', width: 64 },
      ];

      const thinBorder = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };

      const areaHeaderStyle = {
        font: { bold: true, size: 13 },
        alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
      };

      const criteriaHeaderStyle = {
        font: { bold: true, size: 12 },
        alignment: { horizontal: 'left', vertical: 'middle', wrapText: true },
      };

      let rowIndex = 1;

      sheet.mergeCells(`A${rowIndex}:C${rowIndex}`);
      const officeCell = sheet.getCell(`A${rowIndex}`);
      officeCell.value = String(officeName).toUpperCase();
      officeCell.font = { bold: true, size: 14 };
      officeCell.alignment = { horizontal: 'center', vertical: 'middle' };
      officeCell.border = thinBorder;
      sheet.getCell(`B${rowIndex}`).border = thinBorder;
      sheet.getCell(`C${rowIndex}`).border = thinBorder;
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
              criteriaMap: new Map(),
            });
          }

          const areaEntry = areasMap.get(areaKey);
          const critId = row.CriteriaID != null ? Number(row.CriteriaID) : `req_${row.RequirementID}`;
          const parentId = row.ParentCriteriaID != null ? Number(row.ParentCriteriaID) : null;

          if (!areaEntry.criteriaMap.has(critId)) {
            areaEntry.criteriaMap.set(critId, {
              id: critId,
              code: row.CriteriaCode || '',
              name: row.CriteriaName || '',
              parentId: parentId,
              children: [],
              requirements: [],
            });
          }

          if (parentId && !areaEntry.criteriaMap.has(parentId)) {
            areaEntry.criteriaMap.set(parentId, {
              id: parentId,
              code: row.ParentCriteriaCode || '',
              name: row.ParentCriteriaName || '',
              parentId: null,
              children: [],
              requirements: [],
            });
          }

          areaEntry.criteriaMap.get(critId).requirements.push({
            status: normalizeComplianceStatus(row.ComplianceStatusID, row.ComplianceStatusName),
            requirementCode: row.RequirementCode || 'N/A',
            description: row.Description || '',
            comments: row.Comments || ''
          });
        });

        for (const area of areasMap.values()) {
          for (const node of area.criteriaMap.values()) {
            if (node.parentId && area.criteriaMap.has(node.parentId)) {
              area.criteriaMap.get(node.parentId).children.push(node);
            }
          }
        }

        for (const area of areasMap.values()) {
          sheet.mergeCells(`A${rowIndex}:C${rowIndex}`);
          const areaTitleCell = sheet.getCell(`A${rowIndex}`);
          areaTitleCell.value = `${area.areaCode} - ${area.areaName}`;
          areaTitleCell.font = areaHeaderStyle.font;
          areaTitleCell.alignment = areaHeaderStyle.alignment;
          areaTitleCell.border = thinBorder;
          sheet.getCell(`B${rowIndex}`).border = thinBorder;
          sheet.getCell(`C${rowIndex}`).border = thinBorder;
          rowIndex += 1;

          const allNodes = Array.from(area.criteriaMap.values());
          const roots = allNodes.filter(n => !n.parentId || !area.criteriaMap.has(n.parentId));
          roots.sort((a, b) => (String(a.code || a.name)).localeCompare(String(b.code || b.name)));

          for (const root of roots) {
            sheet.mergeCells(`A${rowIndex}:C${rowIndex}`);
            const criteriaLabel = root.code ? `${String(root.code).trim().replace(/\.+$/, '').toUpperCase()}. ${root.name}` : root.name || 'No Criteria';
            const criteriaCell = sheet.getCell(`A${rowIndex}`);
            criteriaCell.value = criteriaLabel;
            criteriaCell.font = criteriaHeaderStyle.font;
            criteriaCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
            criteriaCell.border = thinBorder;
            sheet.getCell(`B${rowIndex}`).border = thinBorder;
            sheet.getCell(`C${rowIndex}`).border = thinBorder;
            rowIndex += 1;

            for (const req of root.requirements) {
              sheet.getCell(`A${rowIndex}`).value = req.status;
              sheet.getCell(`B${rowIndex}`).value = `${req.requirementCode} - ${req.description}`;
              sheet.getCell(`C${rowIndex}`).value = req.comments || '';
              sheet.getCell(`A${rowIndex}`).alignment = { horizontal: 'left', vertical: 'middle' };
              sheet.getCell(`B${rowIndex}`).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
              sheet.getCell(`C${rowIndex}`).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
              sheet.getCell(`A${rowIndex}`).border = thinBorder;
              sheet.getCell(`B${rowIndex}`).border = thinBorder;
              sheet.getCell(`C${rowIndex}`).border = thinBorder;
              rowIndex += 1;
            }

            const children = (root.children || []).slice().sort((a,b) => (String(a.code || a.name)).localeCompare(String(b.code || b.name)));
            for (const child of children) {
              sheet.mergeCells(`A${rowIndex}:C${rowIndex}`);
              const childLabel = child.code ? `${String(child.code).trim().replace(/\.+$/, '').toUpperCase()}. ${child.name}` : child.name || 'No Criteria';
              const childCell = sheet.getCell(`A${rowIndex}`);
              childCell.value = childLabel;
              childCell.font = { bold: true, size: 11 };
              childCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
              childCell.border = thinBorder;
              sheet.getCell(`B${rowIndex}`).border = thinBorder;
              sheet.getCell(`C${rowIndex}`).border = thinBorder;
              rowIndex += 1;

              for (const req of child.requirements) {
                sheet.getCell(`A${rowIndex}`).value = req.status;
                sheet.getCell(`B${rowIndex}`).value = `${req.requirementCode} - ${req.description}`;
                sheet.getCell(`C${rowIndex}`).value = req.comments || '';
                sheet.getCell(`A${rowIndex}`).alignment = { horizontal: 'left', vertical: 'middle' };
                sheet.getCell(`B${rowIndex}`).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
                sheet.getCell(`C${rowIndex}`).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
                sheet.getCell(`A${rowIndex}`).border = thinBorder;
                sheet.getCell(`B${rowIndex}`).border = thinBorder;
                sheet.getCell(`C${rowIndex}`).border = thinBorder;
                rowIndex += 1;
              }
            }
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

      // Remove any user assignments for this requirement in this office
      try {
        await db.execute('DELETE FROM requirement_user_assignments WHERE RequirementID = ? AND OfficeID = ?', [requirementId, officeId]);
      } catch (cleanupErr) {
        console.error('Failed to cleanup requirement_user_assignments after removing office requirement:', cleanupErr);
      }

      // Also remove any uploaded proof documents (disk + DB) related to this requirement for the office
      try {
        const [files] = await db.query(
          'SELECT id, file_path FROM office_proof_documents WHERE requirement_id = ? AND office_id = ?',
          [requirementId, officeId]
        );

        if (files && files.length > 0) {
          for (const f of files) {
            try {
              const absPath = path.join(__dirname, '..', (f.file_path || '').replace(/^\//, ''));
              if (fs.existsSync(absPath)) {
                fs.unlinkSync(absPath);
              }
            } catch (fsErr) {
              console.warn('Failed to delete requirement proof file from disk during removeOfficeRequirement:', fsErr);
            }
          }

          await db.query('DELETE FROM office_proof_documents WHERE requirement_id = ? AND office_id = ?', [requirementId, officeId]);
        }
      } catch (docErr) {
        console.error('Failed to cleanup office_proof_documents after removing office requirement:', docErr);
      }

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
    const nextStatusId = Number(statusId);

    if (!nextStatusId || ![3, 4, 5].includes(nextStatusId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be 3 (Not Complied), 4 (Partially Complied), or 5 (Complied)"
      });
    }

    try {
      // Check existing status to see if statusId is changing or being set
      const [existingStatusRows] = await db.query(
        `SELECT Status FROM compliancestatusoffices WHERE OfficeID = ? AND RequirementID = ?`,
        [officeId, requirementId]
      );
      const currentStatus = existingStatusRows[0]?.Status;

      // If status is being set or changed, ensure evidence exists
      if (nextStatusId && nextStatusId !== Number(currentStatus)) {
        const [userUploads] = await db.query(
          `SELECT COUNT(*) as cnt FROM requirement_user_assignments 
           WHERE OfficeID = ? AND RequirementID = ? AND HasUploaded = TRUE`,
          [officeId, requirementId]
        );
        const [proofDocs] = await db.query(
          `SELECT COUNT(*) as cnt FROM office_proof_documents 
           WHERE office_id = ? AND (requirement_id = ? OR requirement_id IS NULL)`,
          [officeId, requirementId]
        );

        const hasEvidence = (userUploads[0]?.cnt > 0) || (proofDocs[0]?.cnt > 0);

        if (!hasEvidence) {
          return res.status(400).json({
            success: false,
            message: "Cannot change compliance status: No evidence or proof document has been uploaded for this requirement yet."
          });
        }
      }

      const hasCommentPayload = Object.prototype.hasOwnProperty.call(req.body, 'comments');
      const updateSql = hasCommentPayload
        ? `UPDATE compliancestatusoffices
           SET Status = ?, comments = ?, LastUpdated = CURRENT_TIMESTAMP
           WHERE OfficeID = ? AND RequirementID = ?`
        : `UPDATE compliancestatusoffices
           SET Status = ?, LastUpdated = CURRENT_TIMESTAMP
           WHERE OfficeID = ? AND RequirementID = ?`;
      const updateParams = hasCommentPayload
        ? [nextStatusId, comments || null, officeId, requirementId]
        : [nextStatusId, officeId, requirementId];
      const [updateResult] = await db.query(updateSql, updateParams);

      if (!updateResult?.affectedRows) {
        await db.query(
          `INSERT INTO compliancestatusoffices (OfficeID, RequirementID, Status, comments)
           VALUES (?, ?, ?, ?)`,
          [officeId, requirementId, nextStatusId, hasCommentPayload ? (comments || null) : null]
        );
      }

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

    // Insert or update the overall status in PostgreSQL
    await db.query(
      `INSERT INTO OverallOfficeStatus 
        (OfficeID, CompliedCount, PartiallyCompliedCount, NotCompliedCount, TotalRequirements, CompliancePercent, OverallStatus)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (OfficeID) DO UPDATE SET
        CompliedCount = EXCLUDED.CompliedCount,
        PartiallyCompliedCount = EXCLUDED.PartiallyCompliedCount,
        NotCompliedCount = EXCLUDED.NotCompliedCount,
        TotalRequirements = EXCLUDED.TotalRequirements,
        CompliancePercent = EXCLUDED.CompliancePercent,
        OverallStatus = EXCLUDED.OverallStatus,
        LastUpdated = CURRENT_TIMESTAMP`,
      [officeId, complied, partially, notComplied, total, compliancePercent.toFixed(2), overallStatus]
    );

  } catch (err) {
    console.error('Error updating overall office status:', err);
    throw err;
  }
}

module.exports = OfficesController;
