// Controller for deleting a user's uploaded requirement file
const path = require('path');
const fs = require('fs');
const db = require('../db');

// DELETE /api/requirements/:requirementId/file/:userId
exports.deleteUserRequirementFile = async (req, res) => {
  const { requirementId, userId } = req.params;
  try {
    // Find the file path in DB
    const [rows] = await db.query(
      'SELECT file_path FROM requirement_user_uploads WHERE requirement_id = ? AND user_id = ? ORDER BY uploaded_at DESC LIMIT 1',
      [requirementId, userId]
    );
    if (!rows.length || !rows[0].file_path) {
      return res.status(404).json({ success: false, message: 'File not found.' });
    }
    const filePath = path.join(__dirname, '..', rows[0].file_path);
    // Delete file from disk
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    // Remove DB record (optional: you may want to keep a log)
    await db.query(
      'DELETE FROM requirement_user_uploads WHERE requirement_id = ? AND user_id = ?',
      [requirementId, userId]
    );
    // Optionally, update HasUploaded status in assignment table
    await db.query(
      'UPDATE requirement_assignments SET HasUploaded = 0 WHERE requirement_id = ? AND user_id = ?',
      [requirementId, userId]
    );
    res.json({ success: true, message: 'File deleted.' });
  } catch (err) {
    console.error('Delete user requirement file error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};
