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
      const [areaResult] = await db.query(
        'INSERT INTO areas (AreaCode, AreaName, EventID, Description, IsActive, SortOrder, CreatedAt, UpdatedAt) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
        [area.AreaCode, area.AreaName, newEventId, area.Description, area.IsActive, area.SortOrder]
      );
      areaIdMap[area.AreaID] = areaResult.insertId;
    }

    // 2. Copy CRITERIA (including no-area criteria) with ParentCriteriaID remapping
    const [criteria] = await db.query('SELECT * FROM criteria WHERE EventID = ?', [sourceEventId]);
    const criteriaIdMap = {}; // oldCriteriaId -> newCriteriaId
    // First pass: insert all criteria without ParentCriteriaID
    for (const crit of criteria) {
      const newAreaId = crit.AreaID ? areaIdMap[crit.AreaID] : null;
      try {
        const [critResult] = await db.query(
          'INSERT INTO criteria (CriteriaCode, EventID, AreaID, ParentCriteriaID, CriteriaName, Description, CreatedAt, UpdatedAt, IsActive) VALUES (?, ?, ?, NULL, ?, ?, NOW(), NOW(), ?)',
          [crit.CriteriaCode, newEventId, newAreaId, crit.CriteriaName, crit.Description, crit.IsActive]
        );
        criteriaIdMap[crit.CriteriaID] = critResult.insertId;
      } catch (err) {
        console.error('Error inserting criteria:', err, crit);
        throw err;
      }
    }
    // Second pass: update ParentCriteriaID for those that had it
    for (const crit of criteria) {
      if (crit.ParentCriteriaID) {
        const newCritId = criteriaIdMap[crit.CriteriaID];
        const newParentId = criteriaIdMap[crit.ParentCriteriaID] || null;
        try {
          await db.query('UPDATE criteria SET ParentCriteriaID = ? WHERE CriteriaID = ?', [newParentId, newCritId]);
        } catch (err) {
          console.error('Error updating ParentCriteriaID:', err, crit);
          throw err;
        }
      }
    }

    // 3. Copy REQUIREMENTS with ParentRequirementCode remapping
    const criteriaIds = Object.keys(criteriaIdMap);
    if (criteriaIds.length > 0) {
      const [requirements] = await db.query('SELECT * FROM requirements WHERE CriteriaID IN (?)', [criteriaIds]);
      for (const req of requirements) {
        const newCriteriaId = req.CriteriaID ? criteriaIdMap[req.CriteriaID] : null;
        try {
          await db.query(
            'INSERT INTO requirements (RequirementCode, Description, CriteriaID, ParentRequirementCode, CreatedAt, UpdatedAt) VALUES (?, ?, ?, ?, NOW(), NOW())',
            [req.RequirementCode, req.Description, newCriteriaId, req.ParentRequirementCode]
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
const db = require('../db');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { recordLog } = require('./logsController');

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

// Helper function to sanitize folder name (remove invalid characters)
const sanitizeFolderName = (name) => {
  if (!name) return '';
  // Replace any non-alphanumeric character with underscore, collapse multiple underscores, trim edges
  return name
    .replace(/[^A-Za-z0-9.-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .trim();
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
    const { EventName, EventCode, Description, status } = req.body;

    // Debug logging
    console.log('updateEvent called with:', { id, EventName, EventCode, Description });

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

    // Update event, including status (do not touch CreatedAt)
    const [result] = await db.query(
      'UPDATE Events SET EventName = ?, EventCode = ?, Description = ?, status = ?, UpdatedAt = NOW() WHERE EventID = ?',
      [EventName, EventCode, Description || null, status, id]
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

// Get list of downloadable event folders
const getDownloadableFolders = async (req, res) => {
  try {
    const eventsBasePath = path.join(__dirname, '..', 'uploads', 'events');
    
    // Check if events directory exists
    if (!fs.existsSync(eventsBasePath)) {
      return res.json({
        success: true,
        folders: []
      });
    }

    // Read all directories in uploads/events
    const entries = fs.readdirSync(eventsBasePath, { withFileTypes: true });
    const folders = entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);

    res.json({
      success: true,
      folders
    });
  } catch (error) {
    console.error('Error fetching downloadable folders:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching downloadable folders'
    });
  }
};

// Download event folder as zip
const downloadEventZip = async (req, res) => {
  try {
    const { eventName } = req.params;

    if (!eventName) {
      return res.status(400).json({
        success: false,
        message: 'Event name is required'
      });
    }

    // Sanitize the event name to match folder name
    const sanitizedName = sanitizeFolderName(eventName);
    const eventsBasePath = path.join(__dirname, '..', 'uploads', 'events');

    // First try exact sanitized folder name
    let eventFolderPath = path.join(eventsBasePath, sanitizedName);

    // If exact folder doesn't exist, try to find a folder whose sanitized form matches
    if (!fs.existsSync(eventFolderPath)) {
      try {
        const entries = fs.readdirSync(eventsBasePath, { withFileTypes: true });
        const matched = entries.find(entry => entry.isDirectory() && sanitizeFolderName(entry.name) === sanitizedName);
        if (matched) {
          eventFolderPath = path.join(eventsBasePath, matched.name);
        }
      } catch (err) {
        // ignore and proceed to not-found below
      }
    }

    // Check if folder exists after matching attempt
    if (!fs.existsSync(eventFolderPath)) {
      return res.status(404).json({
        success: false,
        message: 'Event folder not found'
      });
    }

    // Check if folder is actually a directory
    const stats = fs.statSync(eventFolderPath);
    if (!stats.isDirectory()) {
      return res.status(400).json({
        success: false,
        message: 'Event path is not a directory'
      });
    }

    // Set headers for zip download
    const zipFileName = `${sanitizedName}.zip`;
    res.attachment(zipFileName);
    res.contentType('application/zip');

    // Create archiver instance
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    // Handle errors
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Error creating zip file'
        });
      }
    });

    // Pipe archive data to response
    archive.pipe(res);

    // Add the entire folder to the archive
    archive.directory(eventFolderPath, false);

    // Finalize the archive
    await archive.finalize();
  } catch (error) {
    console.error('Error downloading event zip:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Error downloading event folder'
      });
    }
  }
};

module.exports = {
  getAllEvents,
  addEvent,
  deleteEvents,
  updateEvent,
  getDownloadableFolders,
  downloadEventZip,
  copyEvent
};
