const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const OfficesController = require('../controllers/OfficesController');
const { saveOfficeProofDocument } = require('../utils/officeProof');
const db = require('../db');
const auth = require('../middleware/auth');

// Multer config for proof document uploads (matches requirements upload pattern)
const tempProofUploadDir = path.join(__dirname, '../uploads/tmp-proof-uploads');
if (!fs.existsSync(tempProofUploadDir)) {
    fs.mkdirSync(tempProofUploadDir, { recursive: true });
}
const upload = multer({
    dest: tempProofUploadDir,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        if (extname) {
            cb(null, true);
        } else {
            cb(new Error('File type not allowed. Only images, PDFs, and Office documents are allowed.'));
        }
    }
});

// ...existing office routes...
router.post('/:id/proof', upload.single('file'), async (req, res) => {
  try {
    // Debug logging for upload
    console.log('--- Proof Upload Debug ---');
    console.log('Office ID:', req.params.id);
    console.log('File original name:', req.file && req.file.originalname);
    console.log('Temp upload path:', req.file && req.file.path);

    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const officeId = req.params.id;
    // Get office name and event ID from database
    const [officeRows] = await db.query('SELECT OfficeName, EventID FROM offices WHERE OfficeID = ?', [officeId]);
    if (officeRows.length === 0) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, message: 'Office not found' });
    }
    const officeName = officeRows[0].OfficeName;
    const eventId = officeRows[0].EventID;
    console.log('Office name from DB:', officeName);
    console.log('Event ID from DB:', eventId);
    if (!eventId) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'Office is not assigned to an event' });
    }
    // Get event name from database
    const [eventRows] = await db.query('SELECT EventName FROM events WHERE EventID = ?', [eventId]);
    if (eventRows.length === 0) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    const eventName = eventRows[0].EventName;
    console.log('Event name from DB:', eventName);
    // Sanitize event name and office name for folder and filename
    const safeEventName = eventName.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 40);
    const safeOfficeName = officeName.replace(/[^a-zA-Z0-9-]/g, '.').substring(0, 40);
    console.log('Sanitized event name:', safeEventName);
    console.log('Sanitized office name:', safeOfficeName);
    // Get file extension from original file
    const ext = path.extname(req.file.originalname);
    console.log('File extension:', ext);
    // Try to get user info from token (if available)
    let safeUserName = 'UnknownUser';
    try {
      const authHeader = req.headers['authorization'] || req.headers['Authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        // If you use JWT and want to decode, require jwt and decode here
        // const jwt = require('jsonwebtoken');
        // const decoded = jwt.decode(token);
        // safeUserName = decoded && decoded.username ? decoded.username.replace(/[^a-zA-Z0-9-]/g, '.') : 'UnknownUser';
      }
    } catch (e) {}
    // Use a filename pattern similar to requirement upload: {office_name}.proof.{user}.{ext}
    const finalFileName = `${safeOfficeName}.proof.${safeUserName}${ext}`;
    console.log('Final file name:', finalFileName);
    const eventDir = path.join(__dirname, `../uploads/events/${safeEventName}`);
    console.log('Event directory:', eventDir);
    if (!fs.existsSync(eventDir)) {
      fs.mkdirSync(eventDir, { recursive: true });
    }
    const destPath = path.join(eventDir, finalFileName);
    console.log('Destination path:', destPath);
    // Delete old proof document if exists (both from database and filesystem)
    try {
      const [oldDocs] = await db.query(
        'SELECT file_path FROM office_proof_documents WHERE office_id = ? AND requirement_id IS NULL ORDER BY uploaded_at DESC LIMIT 1',
        [officeId]
      );
      if (oldDocs.length > 0 && oldDocs[0].file_path) {
        const oldFilePath = path.join(__dirname, '..', oldDocs[0].file_path);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      if (fs.existsSync(destPath)) {
        fs.unlinkSync(destPath);
      }
    } catch (oldFileError) {
      console.error('Error deleting old file:', oldFileError);
    }
    // Move file from temp to final location
    if (!fs.existsSync(req.file.path)) {
      return res.status(500).json({ success: false, message: 'Temp file not found' });
    }
    try {
      fs.renameSync(req.file.path, destPath);
    } catch (renameError) {
      console.error('Error renaming file:', renameError);
      try {
        fs.copyFileSync(req.file.path, destPath);
        fs.unlinkSync(req.file.path);
      } catch (copyError) {
        console.error('Error copying file:', copyError);
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(500).json({ success: false, message: 'Failed to save file', error: copyError.message });
      }
    }
    // Relative path for database and URL
    const filePath = `/uploads/events/${safeEventName}/${finalFileName}`;
    console.log('Relative file path for DB/URL:', filePath);
    // Save to database
    await saveOfficeProofDocument(officeId, finalFileName, req.file.originalname, filePath);
    if (!fs.existsSync(destPath)) {
      console.error('ERROR: File was not saved to expected location:', destPath);
      return res.status(500).json({ success: false, message: 'File was not saved correctly' });
    }
    console.log('--- Proof Upload Debug End ---');
    res.json({ 
      success: true, 
      filename: finalFileName, 
      url: filePath,
      originalname: req.file.originalname,
      officeName: officeName,
      eventName: eventName
    });
  } catch (err) {
    console.error('Upload error:', err);
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up temp file:', cleanupError);
      }
    }
    res.status(500).json({ success: false, message: 'Failed to upload document', error: err.message });
  }
    
});


// Get the latest proof document for an office (filter by requirement_id IS NULL to only get proof documents, not requirement files)
router.get('/:id/proof', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM office_proof_documents WHERE office_id = ? AND requirement_id IS NULL ORDER BY uploaded_at DESC LIMIT 1`,
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.json({ success: false, message: 'No proof document found' });
    }
    const doc = rows[0];
    // Use file_path from database (should be the event-based path)
    let fileUrl = doc.file_path;
    
    // Backwards compatibility: if file_path is old format or doesn't exist, try to construct it
    if (!fileUrl || fileUrl.includes('/uploads/documents/')) {
      // Try to construct from event if we can find it
      const [officeRows] = await db.query('SELECT EventID FROM offices WHERE OfficeID = ?', [req.params.id]);
      if (officeRows.length > 0 && officeRows[0].EventID) {
        const [eventRows] = await db.query('SELECT EventName FROM events WHERE EventID = ?', [officeRows[0].EventID]);
        if (eventRows.length > 0) {
          const safeEventName = eventRows[0].EventName.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 40);
          const safeOfficeName = doc.file_name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9-]/g, '.');
          const ext = path.extname(doc.file_name);
          fileUrl = `/uploads/events/${safeEventName}/offices/${safeOfficeName}/proof/${doc.file_name}`;
        } else {
          fileUrl = fileUrl || `/uploads/documents/${doc.file_name}`;
        }
      } else {
        fileUrl = fileUrl || `/uploads/documents/${doc.file_name}`;
      }
    }
    
    res.json({
      success: true,
      file_name: doc.file_name,
      file_path: doc.file_path || null,
      url: fileUrl,
      uploaded_at: doc.uploaded_at
    });
  } catch (err) {
    console.error('Error fetching proof document:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch proof document', error: err.message });
  }
});

// Delete latest proof document for an office (admin Unsubmit)
router.delete('/:id/proof', auth, async (req, res) => {
  try {
    const officeId = req.params.id;
    // Find latest proof document (requirement_id IS NULL)
    const [rows] = await db.query(
      'SELECT * FROM office_proof_documents WHERE office_id = ? AND requirement_id IS NULL ORDER BY uploaded_at DESC LIMIT 1',
      [officeId]
    );
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No proof document found for this office' });
    }
    const doc = rows[0];
    // Delete file from disk
    try {
      const filePath = path.join(__dirname, '..', doc.file_path.replace(/^\//, ''));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (fsErr) {
      console.warn('Failed to delete proof file from disk:', fsErr);
    }
    // Delete DB record (match by office_id and file_path/file_name)
    await db.query(
      'DELETE FROM office_proof_documents WHERE office_id = ? AND requirement_id IS NULL AND (file_path = ? OR file_name = ?) LIMIT 1',
      [officeId, doc.file_path, doc.file_name]
    );
    res.json({ success: true, message: 'Proof document deleted' });
  } catch (err) {
    console.error('Error deleting proof document:', err);
    res.status(500).json({ success: false, message: 'Failed to delete proof document', error: err.message });
  }
});

module.exports = router;
