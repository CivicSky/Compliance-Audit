const db = require('../db');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

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
  return name.replace(/[<>:"/\\|?*]/g, '_').trim();
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

    // Create folder for the event inside uploads/events
    const sanitizedName = sanitizeFolderName(EventName);
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
    const eventFolderPath = path.join(__dirname, '..', 'uploads', 'events', sanitizedName);

    // Check if folder exists
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
  downloadEventZip
};