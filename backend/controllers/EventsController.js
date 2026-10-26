const db = require('../db');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { recordLog } = require('./logsController');

const sanitizeFolderName = (s) =>
  String(s || '')
    .replace(/[^A-Za-z0-9.-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .trim();

// Copy event (migrated from frontend)
const copyEvent = async (req, res) => {
  try {
    const { sourceEventId, newEventName, newEventCode, newDescription } = req.body;
    if (!sourceEventId || !newEventName || !newEventCode) {
      return res.status(400).json({
        success: false,
        message: 'Source event ID, new event name, and new event code are required'
      });
    }

    // Get source event
    const [rows] = await db.query('SELECT * FROM Events WHERE eventid = ?', [sourceEventId]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Source event not found' });
    }
    const sourceEvent = rows[0];

    // Check if eventcode already exists
    const [existingCode] = await db.query('SELECT * FROM Events WHERE eventcode = ?', [newEventCode]);
    if (existingCode && existingCode.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Event Code "${newEventCode}" is already in use. Please enter a unique Event Code.`
      });
    }

    // Insert new event
    const [result] = await db.query(
      'INSERT INTO Events (eventname, eventcode, Description, createdat, updatedat) VALUES (?, ?, ?, NOW(), NOW())',
      [newEventName, newEventCode, newDescription || sourceEvent.Description || null]
    );

    // Skipping creation of any folder for the copied event (no filesystem side-effects)
    const sanitize = sanitizeFolderName;

    // --- BEGIN: Copy Areas, Criteria, Requirements ---
    const newEventId = result.insertId;

    // 1. Copy AREAS
    const [areas] = await db.query('SELECT * FROM areas WHERE eventid = ?', [sourceEventId]);
    const areaIdMap = {}; // oldAreaId -> newAreaId
    for (const area of areas) {
      const oldAreaId = area.areaid ?? area.areaid;
      const [areaResult] = await db.query(
        'INSERT INTO areas (areacode, areaname, eventid, Description, isactive, sortorder, createdat, updatedat) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
        [area.areacode ?? area.areacode, area.areaname ?? area.areaname, newEventId, area.Description ?? area.description, area.isactive ?? area.isactive ?? 1, area.sortorder ?? area.sortorder ?? 0]
      );
      const newAreaId = areaResult[0]?.areaid ?? areaResult[0]?.areaid ?? areaResult.insertId;
      if (oldAreaId) areaIdMap[oldAreaId] = newAreaId;
    }

    // 2. Copy CRITERIA (including no-area criteria) with parentcriteriaid remapping
    const [criteria] = await db.query('SELECT * FROM criteria WHERE eventid = ?', [sourceEventId]);
    const criteriaIdMap = {}; // oldCriteriaId -> newCriteriaId
    // First pass: insert all criteria without parentcriteriaid
    for (const crit of criteria) {
      const oldCritId = crit.criteriaid ?? crit.criteriaid;
      const origAreaId = crit.areaid ?? crit.areaid;
      const newAreaId = origAreaId && areaIdMap[origAreaId] ? areaIdMap[origAreaId] : null;
      try {
        const [critResult] = await db.query(
          'INSERT INTO criteria (criteriacode, eventid, areaid, parentcriteriaid, criterianame, Description, createdat, updatedat, isactive) VALUES (?, ?, ?, NULL, ?, ?, NOW(), NOW(), ?)',
          [crit.criteriacode ?? crit.criteriacode, newEventId, newAreaId, crit.criterianame ?? crit.criterianame, crit.Description ?? crit.description, crit.isactive ?? crit.isactive ?? 1]
        );
        const newCritId = critResult[0]?.criteriaid ?? critResult[0]?.criteriaid ?? critResult.insertId;
        if (oldCritId) criteriaIdMap[oldCritId] = newCritId;
      } catch (err) {
        console.error('Error inserting criteria:', err, crit);
        throw err;
      }
    }
    // Second pass: update parentcriteriaid for those that had it
    for (const crit of criteria) {
      const oldCritId = crit.criteriaid ?? crit.criteriaid;
      const oldParentId = crit.parentcriteriaid ?? crit.parentcriteriaid;
      if (oldParentId) {
        const newCritId = criteriaIdMap[oldCritId];
        const newParentId = criteriaIdMap[oldParentId] || null;
        if (newCritId && newParentId) {
          try {
            await db.query('UPDATE criteria SET parentcriteriaid = ? WHERE criteriaid = ?', [newParentId, newCritId]);
          } catch (err) {
            console.error('Error updating parentcriteriaid:', err, crit);
            throw err;
          }
        }
      }
    }

    // 3. Copy REQUIREMENTS with parentrequirementcode remapping
    const criteriaIds = Object.keys(criteriaIdMap).map(Number).filter(Boolean);
    if (criteriaIds.length > 0) {
      const [requirements] = await db.query(`SELECT * FROM requirements WHERE criteriaid IN (${criteriaIds.join(',')})`);
      for (const req of requirements) {
        const origCritId = req.criteriaid ?? req.criteriaid;
        const newCriteriaId = origCritId && criteriaIdMap[origCritId] ? criteriaIdMap[origCritId] : null;
        try {
          await db.query(
            'INSERT INTO requirements (requirementcode, Description, criteriaid, parentrequirementcode, createdat, updatedat) VALUES (?, ?, ?, ?, NOW(), NOW())',
            [req.requirementcode ?? req.requirementcode, req.Description ?? req.description, newCriteriaId, req.parentrequirementcode ?? req.parentrequirementcode ?? null]
          );
        } catch (err) {
          console.error('Error inserting requirement:', err, req);
          throw err;
        }
      }
    }
    // --- END: Copy Areas, Criteria, Requirements ---

    res.json({
      success: true,
      message: 'Event copied successfully',
      data: {
        eventid: newEventId,
        eventname: newEventName,
        eventcode: newEventCode,
        Description: newDescription || sourceEvent.Description,
        FolderPath: sanitize(newEventCode || newEventName)
      }
    });
    if (req.user && req.user.userid) {
      try {
        recordLog(req.user.userid, 'EventCopied', {
          sourceEventId: sourceEvent.eventid,
          sourceEventName: sourceEvent.eventname,
          newEventId,
          newEventName,
          newEventCode
        });
      } catch (e) {}
    }
  } catch (error) {
    console.error('Error copying event:', error);
    res.status(500).json({ success: false, message: 'Error copying event' });
  }
};

// Get all events (with role-based scoping for Personnel and Auditors)
const getAllEvents = async (req, res) => {
  try {
    const userid = Number(req.user?.userid);
    let roleid = Number(req.user?.roleid);

    // If roleid not present on req.user, look up user's role from DB
    if (!roleid && userid) {
      const [[userRow]] = await db.query('SELECT roleid FROM users WHERE userid = ?', [userid]);
      if (userRow) roleid = Number(userRow.roleid);
    }

    const isAdmin = roleid === 1;

    // Admins see all events
    if (isAdmin || !userid) {
      const [events] = await db.query('SELECT * FROM Events ORDER BY createdat DESC');
      return res.json({
        success: true,
        data: events
      });
    }

    // Auditor: only see events where they have area assignments
    if (roleid === 4) {
      const [events] = await db.query(
        `SELECT DISTINCT e.*
         FROM Events e
         JOIN areas ar ON ar.eventid = e.eventid
         JOIN auditorareaassignments aaa ON aaa.areaid = ar.areaid
         WHERE aaa.auditoruserid = ?
         ORDER BY e.createdat DESC`,
        [userid]
      );
      return res.json({
        success: true,
        data: events
      });
    }

    // Personnel / Office Head / Officer (roleid 2, 3, etc.):
    // Only see events where the user is managing an office/program or assigned requirements/areas under that specific accreditation
    const [events] = await db.query(
      `SELECT DISTINCT e.*
       FROM Events e
       WHERE e.eventid IN (
         -- 1. Direct office assignment via officeheadassignments (joined with headofoffice)
         SELECT o.eventid
         FROM officeheadassignments oha
         JOIN headofoffice h ON oha.headid = h.headid
         JOIN offices o ON oha.officeid = o.officeid
         WHERE h.userid = ? AND o.eventid IS NOT NULL

         UNION

         -- 2. Direct requirement assignments to user on an office under the event
         SELECT o.eventid
         FROM requirementuserassignments rua
         JOIN offices o ON rua.officeid = o.officeid
         WHERE rua.userid = ? AND o.eventid IS NOT NULL

         UNION

         -- 3. Direct requirement assignments linked to criteria under the event
         SELECT c.eventid
         FROM requirementuserassignments rua
         JOIN requirements r ON rua.requirementid = r.requirementid
         JOIN criteria c ON r.criteriaid = c.criteriaid
         WHERE rua.userid = ? AND c.eventid IS NOT NULL

         UNION

         -- 4. Direct requirement assignments linked to criteria -> area under the event
         SELECT a.eventid
         FROM requirementuserassignments rua
         JOIN requirements r ON rua.requirementid = r.requirementid
         JOIN criteria c ON r.criteriaid = c.criteriaid
         JOIN areas a ON c.areaid = a.areaid
         WHERE rua.userid = ? AND a.eventid IS NOT NULL

         UNION

         -- 5. Direct assignment via personnelassignments table
         SELECT pa.eventid
         FROM personnelassignments pa
         WHERE pa.userid = ? AND pa.eventid IS NOT NULL

         UNION

         -- 6. Assignment via personnelassignments linked to area
         SELECT ar.eventid
         FROM personnelassignments pa
         JOIN areas ar ON pa.areaid = ar.areaid
         WHERE pa.userid = ? AND ar.eventid IS NOT NULL

         UNION

         -- 7. Assignment via personnelassignments linked to criteria
         SELECT c.eventid
         FROM personnelassignments pa
         JOIN criteria c ON pa.criteriaid = c.criteriaid
         WHERE pa.userid = ? AND c.eventid IS NOT NULL

         UNION

         -- 8. Assignment via personnelassignments linked to requirements
         SELECT c.eventid
         FROM personnelassignments pa
         JOIN requirements r ON pa.requirementid = r.requirementid
         JOIN criteria c ON r.criteriaid = c.criteriaid
         WHERE pa.userid = ? AND c.eventid IS NOT NULL
       )
       ORDER BY e.createdat DESC`,
      [userid, userid, userid, userid, userid, userid, userid, userid]
    );

    return res.json({
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
    const { eventname, eventcode, Description, accreditationlevel } = req.body;

    // Validate required fields
    if (!eventname || !eventcode) {
      return res.status(400).json({
        success: false,
        message: 'Event name and code are required'
      });
    }

    // Insert new event
    const [result] = await db.query(
      'INSERT INTO Events (eventname, eventcode, Description, createdat, updatedat, accreditationlevel) VALUES (?, ?, ?, NOW(), NOW(), ?)',
      [eventname, eventcode, Description || null, accreditationlevel || 'N/A']
    );

    // Create folder for the event inside uploads/events using eventcode (preferred for shorter, stable folder names)
    const sanitizedName = sanitizeFolderName(eventcode || eventname);
    const eventFolderPath = path.join(__dirname, '..', 'uploads', 'events', sanitizedName);
    
    // Ensure uploads/events directory exists
    const eventsBasePath = path.join(__dirname, '..', 'uploads', 'events');
    if (!fs.existsSync(eventsBasePath)) {
      fs.mkdirSync(eventsBasePath, { recursive: true });
    }
    
    // Create the event-specific folder
    if (!fs.existsSync(eventFolderPath)) {
      fs.mkdirSync(eventFolderPath, { recursive: true });
      console.log(`Created event folder: ${eventFolderPath}`);
    }

    res.json({
      success: true,
      message: 'Event added successfully',
      data: {
        eventid: result.insertId,
        eventname,
        eventcode,
        Description,
        accreditationlevel: accreditationlevel || 'N/A',
        FolderPath: sanitizedName
      }
    });
    if (req.user && req.user.userid) {
      try {
        recordLog(req.user.userid, 'EventAdded', { eventid: result.insertId, eventname, eventcode });
      } catch (e) {}
    }
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

      // 1. Clean up requirements under criteria linked to these events (or under areas of these events)
      try {
        const [targetCriteria] = await db.query(
          `SELECT criteriaid FROM criteria WHERE eventid IN (${placeholders}) OR areaid IN (SELECT areaid FROM areas WHERE eventid IN (${placeholders}))`,
          [...eventIds, ...eventIds]
        );
        if (targetCriteria && targetCriteria.length > 0) {
          const critIds = targetCriteria.map(c => c.criteriaid ?? c.criteriaid).filter(Boolean);
          if (critIds.length > 0) {
            const critPlaceholders = critIds.map(() => '?').join(',');
            await db.query(`DELETE FROM officeproofdocuments WHERE requirementid IN (SELECT requirementid FROM requirements WHERE criteriaid IN (${critPlaceholders}))`, critIds);
            await db.query(`DELETE FROM requirementuserassignments WHERE requirementid IN (SELECT requirementid FROM requirements WHERE criteriaid IN (${critPlaceholders}))`, critIds);
            await db.query(`DELETE FROM compliancestatusoffices WHERE requirementid IN (SELECT requirementid FROM requirements WHERE criteriaid IN (${critPlaceholders}))`, critIds);
            await db.query(`DELETE FROM requirements WHERE criteriaid IN (${critPlaceholders})`, critIds);
          }
        }
        // Cleanup any remaining orphaned requirements
        await db.query(`DELETE FROM officeproofdocuments WHERE requirementid IN (SELECT requirementid FROM requirements WHERE criteriaid IS NULL OR criteriaid NOT IN (SELECT criteriaid FROM criteria))`);
        await db.query(`DELETE FROM requirementuserassignments WHERE requirementid IN (SELECT requirementid FROM requirements WHERE criteriaid IS NULL OR criteriaid NOT IN (SELECT criteriaid FROM criteria))`);
        await db.query(`DELETE FROM compliancestatusoffices WHERE requirementid IN (SELECT requirementid FROM requirements WHERE criteriaid IS NULL OR criteriaid NOT IN (SELECT criteriaid FROM criteria))`);
        await db.query(`DELETE FROM requirements WHERE criteriaid IS NULL OR criteriaid NOT IN (SELECT criteriaid FROM criteria)`);
      } catch (cascadeErr) {
        console.error('Error during cascading requirement cleanup in deleteEvents:', cascadeErr);
      }

      // Fetch names and codes for logging before deletion
      const [toDeleteRows] = await db.query(`SELECT eventid, eventname, eventcode FROM Events WHERE eventid IN (${placeholders})`, eventIds);
      const deletedNames = toDeleteRows.map(r => r.eventname);
      const deletedCodes = toDeleteRows.map(r => r.eventcode);

      const [result] = await db.query(
        `DELETE FROM Events WHERE eventid IN (${placeholders})`,
        eventIds
      );
    // Attempt to delete corresponding folders under uploads/events for each deleted event name
    const eventsBasePath = path.join(__dirname, '..', 'uploads', 'events');
    const deletedFolders = [];

    if (fs.existsSync(eventsBasePath)) {
      for (let i = 0; i < toDeleteRows.length; i++) {
        const evName = deletedNames[i];
        const evCode = deletedCodes[i];
        try {
          // prefer code for folder lookup, fallback to name
          const san = sanitizeFolderName(evCode || evName);
          let folderPath = path.join(eventsBasePath, san);

          if (!fs.existsSync(folderPath)) {
            try {
              const entries = fs.readdirSync(eventsBasePath, { withFileTypes: true });
              const matched = entries.find(entry => entry.isDirectory() && sanitizeFolderName(entry.name) === san);
              if (matched) {
                folderPath = path.join(eventsBasePath, matched.name);
              }
            } catch (err) {
              // ignore matching errors
            }
          }

          if (fs.existsSync(folderPath) && fs.statSync(folderPath).isDirectory()) {
            try {
              // Node 14+ supports fs.rmSync with recursive; fallback to rmdirSync if needed
              if (fs.rmSync) {
                fs.rmSync(folderPath, { recursive: true, force: true });
              } else {
                fs.rmdirSync(folderPath, { recursive: true });
              }
              deletedFolders.push(folderPath);
              console.log('Deleted event folder:', folderPath);
            } catch (err) {
              console.warn('Failed to delete event folder:', folderPath, err.message || err);
            }
          }
        } catch (err) {
          console.warn('Error during folder deletion for event', evName, err && err.message ? err.message : err);
        }
      }
    }

    res.json({
      success: true,
      message: `${result.affectedRows} event(s) deleted successfully`,
      deletedCount: result.affectedRows,
      deletedFolders
    });
    if (req.user && req.user.userid) {
      try { recordLog(req.user.userid, 'EventDeleted', { eventIds, deletedNames }); } catch (e) {}
    }
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
    const { eventname, eventcode, Description, status, accreditationlevel } = req.body;

    // Debug logging
    console.log('updateEvent called with:', { id, eventname, eventcode, Description, accreditationlevel });

    // Validate required fields
    if (!eventname || !eventcode) {
      return res.status(400).json({
        success: false,
        message: 'Event name and code are required'
      });
    }

    // Fetch existing event to determine if folder rename is needed (get both name and code)
    let existingEventName = null;
    let existingEventCode = null;
    try {
      const [existingRows] = await db.query('SELECT eventname, eventcode FROM Events WHERE eventid = ?', [id]);
      if (existingRows && existingRows.length > 0) {
        existingEventName = existingRows[0].eventname;
        existingEventCode = existingRows[0].eventcode;
      }
    } catch (err) {
      console.warn('Could not fetch existing event name/code for folder rename check:', err.message || err);
    }

    // Update event, including status and accreditationlevel (do not touch createdat)
    const [result] = await db.query(
      'UPDATE Events SET eventname = ?, eventcode = ?, Description = ?, status = ?, accreditationlevel = ?, updatedat = NOW() WHERE eventid = ?',
      [eventname, eventcode, Description || null, status || 'active', accreditationlevel || 'N/A', id]
    );

    if (result.affectedRows === 0) {
      console.log('No event found with id:', id);
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    console.log('Event updated successfully for id:', id);
    if (req.user && req.user.userid) {
      try {
        const changes = {};
        if (existingEventName && existingEventName !== eventname) changes.eventname = { from: existingEventName, to: eventname };
        if (existingEventCode && existingEventCode !== eventcode) changes.eventcode = { from: existingEventCode, to: eventcode };
        recordLog(req.user.userid, 'EventUpdated', { eventid: id, eventname, eventcode, changes });
      } catch (e) {}
    }
    // If the event name changed, attempt to rename its uploads folder to match new sanitized name
    try {
      // Prefer renaming folders when eventcode changed; fallback to eventname if code absent
      if ((existingEventCode && existingEventCode !== eventcode) || (!existingEventCode && existingEventName && existingEventName !== eventname)) {
        const eventsBasePath = path.join(__dirname, '..', 'uploads', 'events');
        const oldSan = sanitizeFolderName(existingEventCode || existingEventName);
        const newSan = sanitizeFolderName(eventcode || eventname);

        // Locate actual old folder: try exact, then match by sanitized entry names
        let oldFolderPath = path.join(eventsBasePath, oldSan);
        if (!fs.existsSync(oldFolderPath)) {
          try {
            const entries = fs.readdirSync(eventsBasePath, { withFileTypes: true });
            const matched = entries.find(entry => entry.isDirectory() && sanitizeFolderName(entry.name) === oldSan);
            if (matched) oldFolderPath = path.join(eventsBasePath, matched.name);
          } catch (err) {
            // ignore
          }
        }

        const newFolderPath = path.join(eventsBasePath, newSan);

        if (fs.existsSync(oldFolderPath) && fs.statSync(oldFolderPath).isDirectory()) {
          if (!fs.existsSync(newFolderPath)) {
            try {
              fs.renameSync(oldFolderPath, newFolderPath);
              console.log(`Renamed event folder: ${oldFolderPath} -> ${newFolderPath}`);
            } catch (err) {
              console.warn('Failed to rename event folder:', err.message || err);
            }
          } else {
            console.warn('Destination folder already exists, skipping rename:', newFolderPath);
          }
        }
      }
    } catch (err) {
      console.warn('Error while attempting to rename event folder:', err.message || err);
    }
    res.json({
      success: true,
      message: 'Event updated successfully',
      data: {
        eventid: parseInt(id),
        eventname,
        eventcode,
        Description,
        status
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

// Get list of downloadable event folders (DB-driven — works with Supabase storage)
const getDownloadableFolders = async (req, res) => {
  try {
    // Return events that have at least one approved requirement file or office proof document
    const [rows] = await db.query(`
      SELECT DISTINCT e.eventid, e.eventname, e.eventcode
      FROM events e
      WHERE EXISTS (
        SELECT 1 FROM officeproofdocuments opd
        JOIN offices o ON o.officeid = opd.officeid
        WHERE o.eventid = e.eventid 
          AND opd.filepath IS NOT NULL 
          AND opd.filepath != ''
          AND (
            opd.requirementid IS NULL 
            OR LOWER(COALESCE(opd.reviewstatus, '')) = 'approved'
          )
      )
      ORDER BY e.eventname ASC
    `);

    const folders = [];
    rows.forEach(r => {
      if (r.eventid) folders.push(String(r.eventid));
      if (r.eventcode) {
        folders.push(r.eventcode);
        folders.push(sanitizeFolderName(r.eventcode));
      }
      if (r.eventname) {
        folders.push(r.eventname);
        folders.push(sanitizeFolderName(r.eventname));
      }
    });

    res.json({ success: true, folders, eventIds: rows.map(r => r.eventid) });
  } catch (error) {
    console.error('Error fetching downloadable folders:', error);
    res.status(500).json({ success: false, message: 'Error fetching downloadable folders' });
  }
};

// Download event folder as zip — streams files from DB records (Supabase URLs or local disk)
const downloadEventZip = async (req, res) => {
  try {
    const { eventname } = req.params;
    if (!eventname) {
      return res.status(400).json({ success: false, message: 'Event name is required' });
    }

    const sanitizedName = sanitizeFolderName(eventname);

    // Look up the event from DB by ID, eventcode, eventname, or sanitized name
    let event = null;
    if (!isNaN(Number(eventname)) && Number(eventname) > 0) {
      const [byId] = await db.query('SELECT eventid, eventname, eventcode FROM events WHERE eventid = ? LIMIT 1', [Number(eventname)]);
      if (byId && byId.length > 0) event = byId[0];
    }
    if (!event) {
      const [eventRows] = await db.query(
        `SELECT eventid, eventname, eventcode FROM events WHERE eventcode = ? OR eventname = ? LIMIT 1`,
        [eventname, eventname]
      );
      if (eventRows && eventRows.length > 0) event = eventRows[0];
    }
    if (!event) {
      const [allEvents] = await db.query('SELECT eventid, eventname, eventcode FROM events');
      event = allEvents.find(e => 
        sanitizeFolderName(e.eventcode || e.eventname) === sanitizedName ||
        sanitizeFolderName(e.eventname) === sanitizedName ||
        sanitizeFolderName(e.eventcode) === sanitizedName ||
        String(e.eventid) === String(eventname)
      );
    }

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Fetch all APPROVED uploaded evidence files and office proof documents for this event
    const [files] = await db.query(`
      SELECT
        opd.id,
        opd.filename,
        opd.displayname,
        opd.filepath,
        opd.requirementid,
        o.officename,
        r.requirementcode,
        r.Description AS RequirementDescription
      FROM officeproofdocuments opd
      JOIN offices o ON o.officeid = opd.officeid
      LEFT JOIN requirements r ON r.requirementid = opd.requirementid
      WHERE o.eventid = ?
        AND opd.filepath IS NOT NULL
        AND opd.filepath != ''
        AND (
          opd.requirementid IS NULL 
          OR LOWER(COALESCE(opd.reviewstatus, '')) = 'approved'
        )
      ORDER BY o.officename, opd.requirementid, opd.uploadedat
    `, [event.eventid]);

    if (!files.length) {
      return res.status(404).json({ success: false, message: 'No approved evidence files found for this event' });
    }

    const zipDisplayName = sanitizeFolderName(event.eventcode || event.eventname || sanitizedName);
    const zipFileName = `${zipDisplayName}.zip`;
    res.attachment(zipFileName);
    res.contentType('application/zip');

    const archive = archiver('zip', { zlib: { level: 6 } });

    archive.on('error', (err) => {
      console.error('Archive error:', err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Error creating zip file' });
      }
    });

    archive.pipe(res);

    const axios = require('axios');

    // Safe folder/file name helper
    const safeName = (s) => String(s || 'Unknown').replace(/[/\\:*?"<>|]/g, '_').trim();

    // Accreditation folder = sanitized event code/name
    const accreditationFolder = safeName(zipDisplayName);

    for (const file of files) {
      // Office folder
      const officeFolder = safeName(file.officename || 'Office');
      // Evidence file name — prefer displayname, fallback to filename
      let rawFileName = file.displayname || file.filename || 'evidence';
      const ext = path.extname(file.filename || file.filepath || '') || '';
      if (ext && !rawFileName.toLowerCase().endsWith(ext.toLowerCase())) {
        rawFileName = `${rawFileName}${ext}`;
      }
      const evidenceFileName = safeName(rawFileName);
      // Zip path: accreditation / office / evidence_file
      const zipPath = `${accreditationFolder}/${officeFolder}/${evidenceFileName}`;

      const filepath = file.filepath;

      try {
        if (filepath.startsWith('http://') || filepath.startsWith('https://')) {
          // Fetch remote file buffer (handles 301/302 redirects automatically)
          const resp = await axios.get(filepath, { 
            responseType: 'arraybuffer', 
            timeout: 30000 
          });
          archive.append(Buffer.from(resp.data), { name: zipPath });
        } else {
          // Local file path
          const absPath = path.join(__dirname, '..', filepath.replace(/^\//, ''));
          if (fs.existsSync(absPath)) {
            archive.file(absPath, { name: zipPath });
          } else {
            console.warn('Local file not found, skipping:', absPath);
          }
        }
      } catch (fileErr) {
        console.warn(`Skipping file ${file.filename}:`, fileErr.message);
      }
    }

    await archive.finalize();
  } catch (error) {
    console.error('Error downloading event zip:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Error downloading event folder' });
    }
  }
};

// Get accreditation levels
const getAccreditationLevels = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM accreditationlevels ORDER BY id ASC');
    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching accreditation levels:', error);
    res.json({
      success: true,
      data: [
        { id: 1, levelname: 'Level I' },
        { id: 2, levelname: 'Level II' },
        { id: 3, levelname: 'Level III' },
        { id: 4, levelname: 'Level IV' },
        { id: 5, levelname: 'N/A' }
      ]
    });
  }
};

module.exports = {
  getAllEvents,
  addEvent,
  deleteEvents,
  updateEvent,
  getDownloadableFolders,
  downloadEventZip,
  copyEvent,
  getAccreditationLevels
};
