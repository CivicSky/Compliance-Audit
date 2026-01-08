const db = require('../db');
const multer = require('multer');
const path = require('path');

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

    // Create the SQL query to insert the new office head
    const query = `
      INSERT INTO headofoffice (
        UserID, 
        Position, 
        ContactInfo, 
        OfficeID
      ) VALUES (?, ?, ?, ?)
    `;

    const values = [
      userId,
      position.trim(),
      contactInfo ? contactInfo.trim() : null,
      null // OfficeID will be assigned later
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
        OfficeID: null
      }
    });

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
          INSERT INTO headofoffice (UserID, Position, ContactInfo, OfficeID)
          VALUES (?, ?, ?, ?)
        `;
        const values = [userId, position.trim(), userCheck[0].Email || null, null];
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
        h.Position,
        h.ContactInfo,
        u.ProfilePic,
        h.OfficeID
      FROM headofoffice h
      LEFT JOIN users u ON h.UserID = u.UserID
      ORDER BY u.LastName, u.FirstName
    `;

    const [rows] = await db.execute(query);
    console.log('DEBUG: getAllHeads DB rows count:', rows.length);

    res.status(200).json({
      success: true,
      data: rows
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
        h.Position,
        h.ContactInfo,
        u.ProfilePic,
        h.OfficeID
      FROM headofoffice h
      LEFT JOIN users u ON h.UserID = u.UserID
      WHERE h.HeadID = ?
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
      data: rows[0]
    });

  } catch (error) {
    console.error('Error fetching office head:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching office head'
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

    // Create placeholders for the IN clause
    const placeholders = validIds.map(() => '?').join(',');
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

  } catch (error) {
    console.error('Error deleting office heads:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while deleting office heads'
    });
  }
};


