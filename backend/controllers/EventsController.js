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
    const [rows] = await db.query('SELECT * FROM Events WHERE EventID = ?', [sourceEventId]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Source event not found' });
    }
    const sourceEvent = rows[0];

    // Check if EventCode already exists
    const [existingCode] = await db.query('SELECT * FROM Events WHERE EventCode = ?', [newEventCode]);
    if (existingCode && existingCode.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Event Code "${newEventCode}" is already in use. Please enter a unique Event Code.`
      });
    }

    // Insert new event
    const [result] = await db.query(
      'INSERT INTO Events (EventName, EventCode, Description, CreatedAt, UpdatedAt) VALUES (?, ?, ?, NOW(), NOW())',
      [newEventName, newEventCode, newDescription || sourceEvent.Description || null]
    );

    // Skipping creation of any folder for the copied event (no filesystem side-effects)
    const sanitize = sanitizeFolderName;

    // --- BEGIN: Copy Areas, Criteria, Requirements ---
    const newEventId = result.insertId;

    // 1. Copy AREAS
    const [areas] = await db.query('SELECT * FROM areas WHERE EventID = ?', [sourceEventId]);
    const areaIdMap = {}; // oldAreaId -> newAreaId
    for (const area of areas) {
      const oldAreaId = area.AreaID ?? area.areaid;
      const [areaResult] = await db.query(
        'INSERT INTO areas (AreaCode, AreaName, EventID, Description, IsActive, SortOrder, CreatedAt, UpdatedAt) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
        [area.AreaCode ?? area.areacode, area.AreaName ?? area.areaname, newEventId, area.Description ?? area.description, area.IsActive ?? area.isactive ?? 1, area.SortOrder ?? area.sortorder ?? 0]
      );
      const newAreaId = areaResult[0]?.AreaID ?? areaResult[0]?.areaid ?? areaResult.insertId;
      if (oldAreaId) areaIdMap[oldAreaId] = newAreaId;
    }

    // 2. Copy CRITERIA (including no-area criteria) with ParentCriteriaID remapping
    const [criteria] = await db.query('SELECT * FROM criteria WHERE EventID = ?', [sourceEventId]);
    const criteriaIdMap = {}; // oldCriteriaId -> newCriteriaId
    // First pass: insert all criteria without ParentCriteriaID
    for (const crit of criteria) {
      const oldCritId = crit.CriteriaID ?? crit.criteriaid;
      const origAreaId = crit.AreaID ?? crit.areaid;
      const newAreaId = origAreaId && areaIdMap[origAreaId] ? areaIdMap[origAreaId] : null;
      try {
        const [critResult] = await db.query(
          'INSERT INTO criteria (CriteriaCode, EventID, AreaID, ParentCriteriaID, CriteriaName, Description, CreatedAt, UpdatedAt, IsActive) VALUES (?, ?, ?, NULL, ?, ?, NOW(), NOW(), ?)',
          [crit.CriteriaCode ?? crit.criteriacode, newEventId, newAreaId, crit.CriteriaName ?? crit.criterianame, crit.Description ?? crit.description, crit.IsActive ?? crit.isactive ?? 1]
        );
        const newCritId = critResult[0]?.CriteriaID ?? critResult[0]?.criteriaid ?? critResult.insertId;
        if (oldCritId) criteriaIdMap[oldCritId] = newCritId;
      } catch (err) {
        console.error('Error inserting criteria:', err, crit);
        throw err;
      }
    }
    // Second pass: update ParentCriteriaID for those that had it
    for (const crit of criteria) {
      const oldCritId = crit.CriteriaID ?? crit.criteriaid;
      const oldParentId = crit.ParentCriteriaID ?? crit.parentcriteriaid;
      if (oldParentId) {
        const newCritId = criteriaIdMap[oldCritId];
        const newParentId = criteriaIdMap[oldParentId] || null;
        if (newCritId && newParentId) {
          try {
            await db.query('UPDATE criteria SET ParentCriteriaID = ? WHERE CriteriaID = ?', [newParentId, newCritId]);
          } catch (err) {
            console.error('Error updating ParentCriteriaID:', err, crit);
            throw err;
          }
        }
      }
    }

    // 3. Copy REQUIREMENTS with ParentRequirementCode remapping
    const criteriaIds = Object.keys(criteriaIdMap).map(Number).filter(Boolean);
    if (criteriaIds.length > 0) {
      const [requirements] = await db.query(`SELECT * FROM requirements WHERE CriteriaID IN (${criteriaIds.join(',')})`);
      for (const req of requirements) {
        const origCritId = req.CriteriaID ?? req.criteriaid;
        const newCriteriaId = origCritId && criteriaIdMap[origCritId] ? criteriaIdMap[origCritId] : null;
        try {
          await db.query(
            'INSERT INTO requirements (RequirementCode, Description, CriteriaID, ParentRequirementCode, CreatedAt, UpdatedAt) VALUES (?, ?, ?, ?, NOW(), NOW())',
            [req.RequirementCode ?? req.requirementcode, req.Description ?? req.description, newCriteriaId, req.ParentRequirementCode ?? req.parentrequirementcode ?? null]
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
        EventID: newEventId,
        EventName: newEventName,
        EventCode: newEventCode,
        Description: newDescription || sourceEvent.Description,
        FolderPath: sanitize(newEventCode || newEventName)
      }
    });
    if (req.user && req.user.userId) {
      try {
        recordLog(req.user.userId, 'EventCopied', {
          sourceEventId: sourceEvent.EventID,
          sourceEventName: sourceEvent.EventName,
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
    const { EventName, EventCode, Description, accreditation_level } = req.body;

    // Validate required fields
    if (!EventName || !EventCode) {
      return res.status(400).json({
        success: false,
        message: 'Event name and code are required'
      });
    }

    // Insert new event
    const [result] = await db.query(
      'INSERT INTO Events (EventName, EventCode, Description, CreatedAt, UpdatedAt, accreditation_level) VALUES (?, ?, ?, NOW(), NOW(), ?)',
      [EventName, EventCode, Description || null, accreditation_level || 'N/A']
    );

    // Create folder for the event inside uploads/events using EventCode (preferred for shorter, stable folder names)
    const sanitizedName = sanitizeFolderName(EventCode || EventName);
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
        EventID: result.insertId,
        EventName,
        EventCode,
        Description,
        accreditation_level: accreditation_level || 'N/A',
        FolderPath: sanitizedName
      }
    });
    if (req.user && req.user.userId) {
      try {
        recordLog(req.user.userId, 'EventAdded', { EventID: result.insertId, EventName, EventCode });
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
          `SELECT CriteriaID FROM criteria WHERE EventID IN (${placeholders}) OR AreaID IN (SELECT AreaID FROM areas WHERE EventID IN (${placeholders}))`,
          [...eventIds, ...eventIds]
        );
        if (targetCriteria && targetCriteria.length > 0) {
          const critIds = targetCriteria.map(c => c.CriteriaID ?? c.criteriaid).filter(Boolean);
          if (critIds.length > 0) {
            const critPlaceholders = critIds.map(() => '?').join(',');
            await db.query(`DELETE FROM office_proof_documents WHERE requirement_id IN (SELECT RequirementID FROM requirements WHERE CriteriaID IN (${critPlaceholders}))`, critIds);
            await db.query(`DELETE FROM requirement_user_assignments WHERE RequirementID IN (SELECT RequirementID FROM requirements WHERE CriteriaID IN (${critPlaceholders}))`, critIds);
            await db.query(`DELETE FROM compliancestatusoffices WHERE RequirementID IN (SELECT RequirementID FROM requirements WHERE CriteriaID IN (${critPlaceholders}))`, critIds);
            await db.query(`DELETE FROM requirements WHERE CriteriaID IN (${critPlaceholders})`, critIds);
          }
        }
        // Cleanup any remaining orphaned requirements
        await db.query(`DELETE FROM office_proof_documents WHERE requirement_id IN (SELECT RequirementID FROM requirements WHERE CriteriaID IS NULL OR CriteriaID NOT IN (SELECT CriteriaID FROM criteria))`);
        await db.query(`DELETE FROM requirement_user_assignments WHERE RequirementID IN (SELECT RequirementID FROM requirements WHERE CriteriaID IS NULL OR CriteriaID NOT IN (SELECT CriteriaID FROM criteria))`);
        await db.query(`DELETE FROM compliancestatusoffices WHERE RequirementID IN (SELECT RequirementID FROM requirements WHERE CriteriaID IS NULL OR CriteriaID NOT IN (SELECT CriteriaID FROM criteria))`);
        await db.query(`DELETE FROM requirements WHERE CriteriaID IS NULL OR CriteriaID NOT IN (SELECT CriteriaID FROM criteria)`);
      } catch (cascadeErr) {
        console.error('Error during cascading requirement cleanup in deleteEvents:', cascadeErr);
      }

      // Fetch names and codes for logging before deletion
      const [toDeleteRows] = await db.query(`SELECT EventID, EventName, EventCode FROM Events WHERE EventID IN (${placeholders})`, eventIds);
      const deletedNames = toDeleteRows.map(r => r.EventName);
      const deletedCodes = toDeleteRows.map(r => r.EventCode);

      const [result] = await db.query(
        `DELETE FROM Events WHERE EventID IN (${placeholders})`,
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
    if (req.user && req.user.userId) {
      try { recordLog(req.user.userId, 'EventDeleted', { eventIds, deletedNames }); } catch (e) {}
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
    const { EventName, EventCode, Description, status, accreditation_level } = req.body;

    // Debug logging
    console.log('updateEvent called with:', { id, EventName, EventCode, Description, accreditation_level });

    // Validate required fields
    if (!EventName || !EventCode) {
      return res.status(400).json({
        success: false,
        message: 'Event name and code are required'
      });
    }

    // Fetch existing event to determine if folder rename is needed (get both name and code)
    let existingEventName = null;
    let existingEventCode = null;
    try {
      const [existingRows] = await db.query('SELECT EventName, EventCode FROM Events WHERE EventID = ?', [id]);
      if (existingRows && existingRows.length > 0) {
        existingEventName = existingRows[0].EventName;
        existingEventCode = existingRows[0].EventCode;
      }
    } catch (err) {
      console.warn('Could not fetch existing event name/code for folder rename check:', err.message || err);
    }

    // Update event, including status and accreditation_level (do not touch CreatedAt)
    const [result] = await db.query(
      'UPDATE Events SET EventName = ?, EventCode = ?, Description = ?, status = ?, accreditation_level = ?, UpdatedAt = NOW() WHERE EventID = ?',
      [EventName, EventCode, Description || null, status || 'active', accreditation_level || 'N/A', id]
    );

    if (result.affectedRows === 0) {
      console.log('No event found with id:', id);
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    console.log('Event updated successfully for id:', id);
    if (req.user && req.user.userId) {
      try { recordLog(req.user.userId, 'EventUpdated', { EventID: id, EventName, EventCode }); } catch (e) {}
    }
    // If the event name changed, attempt to rename its uploads folder to match new sanitized name
    try {
      // Prefer renaming folders when EventCode changed; fallback to EventName if code absent
      if ((existingEventCode && existingEventCode !== EventCode) || (!existingEventCode && existingEventName && existingEventName !== EventName)) {
        const eventsBasePath = path.join(__dirname, '..', 'uploads', 'events');
        const oldSan = sanitizeFolderName(existingEventCode || existingEventName);
        const newSan = sanitizeFolderName(EventCode || EventName);

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
        EventID: parseInt(id),
        EventName,
        EventCode,
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
    // Return events that have at least one uploaded file in the DB
    const [rows] = await db.query(`
      SELECT DISTINCT e.EventID, e.EventName, e.EventCode
      FROM events e
      WHERE EXISTS (
        SELECT 1 FROM office_proof_documents opd
        JOIN offices o ON o.OfficeID = opd.office_id
        WHERE o.EventID = e.EventID AND opd.file_path IS NOT NULL AND opd.file_path != ''
      )
      ORDER BY e.EventName ASC
    `);

    // Return both folder name (sanitized EventCode) and the original EventName/Code for display
    const folders = rows.map(r => sanitizeFolderName(r.EventCode || r.EventName));

    res.json({ success: true, folders });
  } catch (error) {
    console.error('Error fetching downloadable folders:', error);
    res.status(500).json({ success: false, message: 'Error fetching downloadable folders' });
  }
};

// Download event folder as zip — streams files from DB records (Supabase URLs or local disk)
const downloadEventZip = async (req, res) => {
  try {
    const { eventName } = req.params;
    if (!eventName) {
      return res.status(400).json({ success: false, message: 'Event name is required' });
    }

    const sanitizedName = sanitizeFolderName(eventName);

    // Look up the event from DB by sanitized EventCode or EventName
    const [eventRows] = await db.query(
      `SELECT EventID, EventName, EventCode FROM events WHERE ? IN (EventCode, EventName) OR ? = REGEXP_REPLACE(COALESCE(EventCode, EventName), '[^A-Za-z0-9.-]+', '_') LIMIT 1`,
      [eventName, sanitizedName]
    );

    // Fallback: match by sanitized form
    let event = eventRows[0];
    if (!event) {
      const [allEvents] = await db.query('SELECT EventID, EventName, EventCode FROM events');
      event = allEvents.find(e => sanitizeFolderName(e.EventCode || e.EventName) === sanitizedName);
    }

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Fetch all uploaded evidence files for this event, with office name for folder structure
    const [files] = await db.query(`
      SELECT
        opd.id,
        opd.file_name,
        opd.display_name,
        opd.file_path,
        opd.requirement_id,
        o.OfficeName,
        r.RequirementCode,
        r.Description AS RequirementDescription
      FROM office_proof_documents opd
      JOIN offices o ON o.OfficeID = opd.office_id
      LEFT JOIN requirements r ON r.RequirementID = opd.requirement_id
      WHERE o.EventID = ?
        AND opd.file_path IS NOT NULL
        AND opd.file_path != ''
      ORDER BY o.OfficeName, opd.requirement_id, opd.uploaded_at
    `, [event.EventID]);

    if (!files.length) {
      return res.status(404).json({ success: false, message: 'No files found for this event' });
    }

    const zipFileName = `${sanitizedName}.zip`;
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

    const https = require('https');
    const http = require('http');
    const { Readable } = require('stream');

    // Helper: fetch a remote URL and return a readable stream
    const fetchRemoteStream = (url) => new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      client.get(url, (response) => {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(response);
        } else {
          reject(new Error(`HTTP ${response.statusCode} for ${url}`));
        }
      }).on('error', reject);
    });

    // Safe folder/file name helper
    const safeName = (s) => String(s || 'Unknown').replace(/[/\\:*?"<>|]/g, '_').trim();

    // Accreditation folder = sanitized event code/name
    const accreditationFolder = safeName(sanitizedName);

    for (const file of files) {
      // Office folder
      const officeFolder = safeName(file.OfficeName);
      // Evidence file name — prefer display_name, fallback to file_name
      const evidenceFileName = safeName(file.display_name || file.file_name);
      // Zip path: accreditation / office / evidence_file
      const zipPath = `${accreditationFolder}/${officeFolder}/${evidenceFileName}`;

      const filePath = file.file_path;

      try {
        if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
          // Supabase or remote URL — stream directly into zip
          const stream = await fetchRemoteStream(filePath);
          archive.append(stream, { name: zipPath });
          // Wait for this entry to finish before processing next (avoids overwhelming archiver)
          await new Promise((resolve, reject) => {
            stream.on('end', resolve);
            stream.on('error', reject);
          });
        } else {
          // Local file path
          const absPath = path.join(__dirname, '..', filePath.replace(/^\//, ''));
          if (fs.existsSync(absPath)) {
            archive.file(absPath, { name: zipPath });
          } else {
            console.warn('Local file not found, skipping:', absPath);
          }
        }
      } catch (fileErr) {
        console.warn(`Skipping file ${file.file_name}:`, fileErr.message);
        // Continue with other files even if one fails
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
    const [rows] = await db.query('SELECT * FROM accreditation_levels ORDER BY id ASC');
    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching accreditation levels:', error);
    res.json({
      success: true,
      data: [
        { id: 1, level_name: 'Level I' },
        { id: 2, level_name: 'Level II' },
        { id: 3, level_name: 'Level III' },
        { id: 4, level_name: 'Level IV' },
        { id: 5, level_name: 'N/A' }
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
