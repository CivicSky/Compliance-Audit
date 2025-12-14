const db = require('../db');
const crypto = require('crypto');
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

exports.addHead = async (req, res) => {
  try {
    const { firstName, middleInitial, lastName, position, contactInfo } = req.body;
    
    // Validate required fields
    if (!firstName || !lastName || !position || !contactInfo) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, position, and contact info are required'
      });
    }

    // Get profile picture filename if uploaded (store only filename, not full path)
    const profilePicFilename = req.file ? req.file.filename : null;

    // Create the SQL query to insert the new office head using correct table and column names
    const query = `
      INSERT INTO headofoffice (
        FirstName, 
        MiddleInitial, 
        LastName, 
        Position, 
        ContactInfo, 
        ProfilePic,
        OfficeID
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      firstName.trim(),
      middleInitial ? middleInitial.trim() : null,
      lastName.trim(),
      position.trim(),
      contactInfo.trim(),
      profilePicFilename, // Store only filename
      null // OfficeID will be assigned later as mentioned
    ];

    // Execute the query
    const [result] = await db.execute(query, values);

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Office head added successfully',
      data: {
        HeadID: result.insertId,
        FirstName: firstName.trim(),
        MiddleInitial: middleInitial ? middleInitial.trim() : null,
        LastName: lastName.trim(),
        Position: position.trim(),
        ContactInfo: contactInfo.trim(),
        ProfilePic: profilePicFilename,
        OfficeID: null
      }
    });

  } catch (error) {
    console.error('Error adding office head:', error);
    
    // Handle specific database errors
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'An office head with this information already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error while adding office head',
      error: error.message
    });
  }
};

exports.getAllHeads = async (req, res) => {
  try {
    console.log('DEBUG: getAllHeads route hit');
    const query = `
      SELECT 
        HeadID,
        FirstName,
        MiddleInitial,
        LastName,
        Position,
        ContactInfo,
        ProfilePic,
        OfficeID
      FROM headofoffice 
      ORDER BY LastName, FirstName
    `;

    const [rows] = await db.execute(query);
    console.log('DEBUG: getAllHeads DB rows:', rows);

    res.status(200).json({
      success: true,
      data: rows
    });

  } catch (error) {
    console.error('Error fetching office heads:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching office heads'
    });
  }
};

exports.getHeadById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        HeadID,
        FirstName,
        MiddleInitial,
        LastName,
        Position,
        ContactInfo,
        ProfilePic,
        OfficeID
      FROM headofoffice 
      WHERE HeadID = ?
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


