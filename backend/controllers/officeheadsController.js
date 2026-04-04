const db = require('../db');
const multer = require('multer');
const path = require('path');
const { recordLog } = require('./logsController');
const { createNotifications } = require('../utils/notificationService');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/profile-pics/') // Make sure this directory exists
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

exports.uploadProfilePic = upload.single('profilePic');

// Add a new office head - now requires UserID since names come from users table
exports.addHead = async (req, res) => {
  try {
    const { userId, position, contactInfo } = req.body;
    
    // Validate required fields
    if (!userId || !position) {
      return res.status(400).json({
        success: false,
        message: 'User ID and position are required'
      });
    }

    // Check if user exists
    const [userCheck] = await db.execute('SELECT UserID, FirstName, LastName FROM users WHERE UserID = ?', [userId]);
    if (userCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent duplicate office-head records for the same user
    const [existingHead] = await db.execute('SELECT HeadID FROM headofoffice WHERE UserID = ? LIMIT 1', [userId]);
    if (existingHead.length > 0) {
      return res.status(409).json({
        success: false,
        message: `${userCheck[0].FirstName} ${userCheck[0].LastName} is already an office head`
      });
    }

    // Create the SQL query to insert the new office head
    const query = `
      INSERT INTO headofoffice (
        UserID,
        Position,
        ContactInfo
      ) VALUES (?, ?, ?)
    `;

    const values = [
      userId,
      position.trim(),
      contactInfo ? contactInfo.trim() : null
    ];

    // Execute the query
    const [result] = await db.execute(query, values);

    // Return success response with joined user data
    res.status(201).json({
      success: true,
      message: 'Office head added successfully',
      data: {
        HeadID: result.insertId,
        UserID: userId,
        FirstName: userCheck[0].FirstName,
        LastName: userCheck[0].LastName,
        Position: position.trim(),
        ContactInfo: contactInfo ? contactInfo.trim() : null,
        OfficeID: null,
        OfficeIDs: []
      }
    });

    try {
      const actorId = req.user && req.user.userId;
      if (actorId) {
        const fullName = `${userCheck[0].FirstName} ${userCheck[0].LastName}`.trim();
        await recordLog(actorId, 'OfficeHeadAdded', {
          HeadName: fullName,
          Position: position.trim(),
        });

        await createNotifications({
          userIds: [Number(userId)],
          adminId: actorId,
          title: 'Added As Personnel',
          message: `You were added as office personnel with position ${position.trim()}.`,
          type: 'info',
          relatedTable: 'office_head',
          relatedId: Number(result.insertId),
        });
      }
    } catch (logErr) {
      console.error('Failed to record office head add log:', logErr);
    }

  } catch (error) {
    console.error('Error adding office head:', error);
    
    // Handle specific database errors
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'This user is already an office head'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error while adding office head',
      error: error.message
    });
  }
};

// Add multiple office heads at once from selected users
exports.addMultipleHeads = async (req, res) => {
  try {
    const { userIds, position } = req.body;
    
    // Validate required fields
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one user must be selected'
      });
    }

    if (!position) {
      return res.status(400).json({
        success: false,
        message: 'Position is required'
      });
    }

    const addedHeads = [];
    const errors = [];

    for (const userId of userIds) {
      try {
        // Check if user exists
        const [userCheck] = await db.execute('SELECT UserID, FirstName, LastName, Email FROM users WHERE UserID = ?', [userId]);
        if (userCheck.length === 0) {
          errors.push({ userId, error: 'User not found' });
          continue;
        }

        // Check if user is already an office head
        const [existingHead] = await db.execute('SELECT HeadID FROM headofoffice WHERE UserID = ?', [userId]);
        if (existingHead.length > 0) {
          errors.push({ userId, error: `${userCheck[0].FirstName} ${userCheck[0].LastName} is already an office head` });
          continue;
        }

        // Insert new office head
        const query = `
          INSERT INTO headofoffice (UserID, Position, ContactInfo)
          VALUES (?, ?, ?)
        `;
        const values = [userId, position.trim(), userCheck[0].Email || null];
        const [result] = await db.execute(query, values);

        addedHeads.push({
          HeadID: result.insertId,
          UserID: userId,
          FirstName: userCheck[0].FirstName,
          LastName: userCheck[0].LastName,
          Position: position.trim()
        });
      } catch (err) {
        errors.push({ userId, error: err.message });
      }
    }

    res.status(201).json({
      success: true,
      message: `Successfully added ${addedHeads.length} office head(s)`,
      data: addedHeads,
      errors: errors.length > 0 ? errors : undefined
    });

    try {
      const actorId = req.user && req.user.userId;
      if (actorId && addedHeads.length > 0) {
        await recordLog(actorId, 'OfficeHeadAdded', {
          HeadNames: addedHeads.map((head) => `${head.FirstName} ${head.LastName}`.trim()),
          Position: position.trim(),
          AddedCount: addedHeads.length,
        });

        await createNotifications({
          userIds: addedHeads.map((head) => Number(head.UserID)),
          adminId: actorId,
          title: 'Added As Personnel',
          message: `You were added as office personnel with position ${position.trim()}.`,
          type: 'info',
          relatedTable: 'office_head',
          relatedId: null,
        });
      }
    } catch (logErr) {
      console.error('Failed to record multiple office heads add log:', logErr);
    }

  } catch (error) {
    console.error('Error adding multiple office heads:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while adding office heads',
      error: error.message
    });
  }
};

// Get all office heads with user information from users table
exports.getAllHeads = async (req, res) => {
  try {
    console.log('DEBUG: getAllHeads route hit');
    const query = `
      SELECT 
        h.HeadID,
        h.UserID,
        u.FirstName,
        u.MiddleInitial,
        u.LastName,
        u.Email,
        h.Position,
        h.ContactInfo,
        u.ProfilePic,
        MIN(oha.OfficeID) AS OfficeID,
        GROUP_CONCAT(DISTINCT oha.OfficeID ORDER BY oha.OfficeID) AS OfficeIDs
      FROM headofoffice h
      LEFT JOIN users u ON h.UserID = u.UserID
      LEFT JOIN office_head_assignments oha ON oha.HeadID = h.HeadID
      GROUP BY h.HeadID, h.UserID, u.FirstName, u.MiddleInitial, u.LastName, u.Email, h.Position, h.ContactInfo, u.ProfilePic
      ORDER BY u.LastName, u.FirstName
    `;

    const [rows] = await db.execute(query);
    const normalizedRows = rows.map((row) => ({
      ...row,
      OfficeID: row.OfficeID || null,
      OfficeIDs: row.OfficeIDs ? String(row.OfficeIDs).split(',').map((id) => Number(id)).filter((id) => Number.isInteger(id)) : []
    }));
    console.log('DEBUG: getAllHeads DB rows count:', rows.length);

    res.status(200).json({
      success: true,
      data: normalizedRows
    });

  } catch (error) {
    console.error('Error fetching office heads:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching office heads',
      error: error.message
    });
  }
};

// Get office head by ID
exports.getHeadById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        h.HeadID,
        h.UserID,
        u.FirstName,
        u.MiddleInitial,
        u.LastName,
        u.Email,
        h.Position,
        h.ContactInfo,
        u.ProfilePic,
        MIN(oha.OfficeID) AS OfficeID,
        GROUP_CONCAT(DISTINCT oha.OfficeID ORDER BY oha.OfficeID) AS OfficeIDs
      FROM headofoffice h
      LEFT JOIN users u ON h.UserID = u.UserID
      LEFT JOIN office_head_assignments oha ON oha.HeadID = h.HeadID
      WHERE h.HeadID = ?
      GROUP BY h.HeadID, h.UserID, u.FirstName, u.MiddleInitial, u.LastName, u.Email, h.Position, h.ContactInfo, u.ProfilePic
    `;

    const [rows] = await db.execute(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Office head not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        ...rows[0],
        OfficeID: rows[0].OfficeID || null,
        OfficeIDs: rows[0].OfficeIDs ? String(rows[0].OfficeIDs).split(',').map((officeId) => Number(officeId)).filter((officeId) => Number.isInteger(officeId)) : []
      }
    });

  } catch (error) {
    console.error('Error fetching office head:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching office head'
    });
  }
};

// Update office head + linked user profile fields
exports.updateHead = async (req, res) => {
  try {
    const { id } = req.params;
    const { FirstName, MiddleInitial, LastName, Position, ContactInfo } = req.body;

    const [rows] = await db.execute(
      `SELECT h.HeadID, h.UserID, h.Position, h.ContactInfo,
              u.FirstName, u.MiddleInitial, u.LastName, u.ProfilePic
       FROM headofoffice h
       LEFT JOIN users u ON h.UserID = u.UserID
       WHERE h.HeadID = ?
       LIMIT 1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Office head not found'
      });
    }

    const current = rows[0];

    const nextFirstName = String(FirstName ?? current.FirstName ?? '').trim();
    const nextLastName = String(LastName ?? current.LastName ?? '').trim();
    const nextMiddleInitialRaw = String(MiddleInitial ?? current.MiddleInitial ?? '').trim();
    const nextMiddleInitial = nextMiddleInitialRaw ? nextMiddleInitialRaw.charAt(0) : null;
    const nextPosition = String(Position ?? current.Position ?? '').trim();
    const nextContactInfoRaw = ContactInfo !== undefined
      ? String(ContactInfo ?? '').trim()
      : String(current.ContactInfo ?? '').trim();
    const nextContactInfo = nextContactInfoRaw || null;
    const nextProfilePic = req.file ? req.file.filename : current.ProfilePic;

    if (!nextFirstName || !nextLastName || !nextPosition) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, and position are required'
      });
    }

    await db.execute(
      `UPDATE users
       SET FirstName = ?, MiddleInitial = ?, LastName = ?, ProfilePic = ?
       WHERE UserID = ?`,
      [nextFirstName, nextMiddleInitial, nextLastName, nextProfilePic, current.UserID]
    );

    await db.execute(
      `UPDATE headofoffice
       SET Position = ?, ContactInfo = ?
       WHERE HeadID = ?`,
      [nextPosition, nextContactInfo, id]
    );

    res.status(200).json({
      success: true,
      message: 'Office personnel updated successfully',
      data: {
        HeadID: Number(id),
        UserID: current.UserID,
        FirstName: nextFirstName,
        MiddleInitial: nextMiddleInitial,
        LastName: nextLastName,
        Position: nextPosition,
        ContactInfo: nextContactInfo,
        ProfilePic: nextProfilePic,
      }
    });

    try {
      const actorId = req.user && req.user.userId;
      if (actorId) {
        const previousFullName = `${current.FirstName || ''} ${current.LastName || ''}`.replace(/\s+/g, ' ').trim();
        const nextFullName = `${nextFirstName} ${nextLastName}`.replace(/\s+/g, ' ').trim();
        const changes = {};

        if ((current.FirstName || '') !== nextFirstName || (current.LastName || '') !== nextLastName || (current.MiddleInitial || '') !== (nextMiddleInitial || '')) {
          changes.Name = { from: previousFullName || 'Unknown', to: nextFullName || 'Unknown' };
        }
        if ((current.Position || '') !== nextPosition) {
          changes.Position = { from: current.Position || 'N/A', to: nextPosition };
        }
        if ((current.ContactInfo || '') !== (nextContactInfo || '')) {
          changes.ContactInfo = { from: current.ContactInfo || 'N/A', to: nextContactInfo || 'N/A' };
        }
        if (req.file) {
          changes.ProfilePic = 'Updated';
        }

        await recordLog(actorId, 'OfficeHeadUpdated', {
          HeadName: nextFullName || `Head #${id}`,
          changes,
        });
      }
    } catch (logErr) {
      console.error('Failed to record office head update log:', logErr);
    }
  } catch (error) {
    console.error('Error updating office head:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while updating office head',
      error: error.message
    });
  }
};

// Delete office heads
exports.deleteHeads = async (req, res) => {
  try {
    console.log('Delete request received');
    console.log('Request body:', req.body);
    console.log('Request query:', req.query);
    
    // Handle both body data and query parameters
    let headIds = req.body?.headIds || req.query?.ids;
    
    // If query parameter, convert to array if it's a single value
    if (typeof headIds === 'string') {
      headIds = [headIds];
    }
    
    console.log('Processed headIds:', headIds);

    // Validate input
    if (!headIds || !Array.isArray(headIds) || headIds.length === 0) {
      console.log('Validation failed: Invalid headIds');
      return res.status(400).json({
        success: false,
        message: 'Head IDs array is required'
      });
    }

    // Validate all IDs are numbers
    const validIds = headIds.filter(id => Number.isInteger(Number(id)));
    if (validIds.length !== headIds.length) {
      console.log('Validation failed: Invalid ID format');
      return res.status(400).json({
        success: false,
        message: 'All head IDs must be valid integers'
      });
    }

    // Collect names before deletion for readable audit logs
    const placeholders = validIds.map(() => '?').join(',');
    const [headsToDelete] = await db.execute(
      `SELECT h.HeadID, u.FirstName, u.LastName
       FROM headofoffice h
       LEFT JOIN users u ON h.UserID = u.UserID
       WHERE h.HeadID IN (${placeholders})`,
      validIds
    );

    const query = `DELETE FROM headofoffice WHERE HeadID IN (${placeholders})`;
    
    console.log('Executing query:', query);
    console.log('With parameters:', validIds);

    const [result] = await db.execute(query, validIds);
    
    console.log('Query result:', result);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'No office heads found with the provided IDs'
      });
    }

    res.status(200).json({
      success: true,
      message: `Successfully deleted ${result.affectedRows} office head(s)`,
      deletedCount: result.affectedRows
    });

    try {
      const actorId = req.user && req.user.userId;
      if (actorId && result.affectedRows > 0) {
        await recordLog(actorId, 'OfficeHeadDeleted', {
          HeadNames: headsToDelete.map((row) => `${row.FirstName || ''} ${row.LastName || ''}`.replace(/\s+/g, ' ').trim() || `Head #${row.HeadID}`),
          DeletedCount: result.affectedRows,
        });
      }
    } catch (logErr) {
      console.error('Failed to record office heads delete log:', logErr);
    }

  } catch (error) {
    console.error('Error deleting office heads:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while deleting office heads'
    });
  }
};


