const db = require('../db');
const crypto = require('crypto');

exports.getUsers = async (req, res) => {
  try {
    // Join users with roles to get role name
    const [rows] = await db.query(`
      SELECT u.UserID, u.FullName, u.Email, r.RoleName 
      FROM users u 
      LEFT JOIN roles r ON u.RoleID = r.RoleID
    `);

    // Format users into a clean text output
    const userList = rows.map(user => 
      `ID: ${user.UserID} | Name: ${user.FullName} | Email: ${user.Email} | Role: ${user.RoleName || 'N/A'}`
    ).join('\n');
    
    res.send(userList || 'No users found');
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).send('Error: Could not fetch users');
  }
};

// Login user controller
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }

    // Hash the password for comparison
    const hashedPassword = crypto
      .createHash('md5')
      .update(password)
      .digest('hex');
    
    // Find user by email and password
    const [users] = await db.query(
      'SELECT UserID, FullName, Email, RoleID, ProfilePic FROM users WHERE Email = ? AND PasswordHash = ?', 
      [email, hashedPassword]
    );
    
    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    // Get user role
    const [roles] = await db.query(
      'SELECT RoleName FROM roles WHERE RoleID = ?',
      [users[0].RoleID]
    );

    // Return user data
    const userData = {
      ...users[0],
      role: roles[0].RoleName
    };
    
    res.json({
      success: true,
      message: 'Login successful',
      user: userData
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during login'
    });
  }
};

// Register new user controller
exports.registerUser = async (req, res) => {
  try {
    const { fullName, email, password, roleId } = req.body;
    
    // Validate inputs
    if (!fullName || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, email, and password are required' 
      });
    }
    
    // Check if email already exists
    const [existingUsers] = await db.query('SELECT UserID FROM users WHERE Email = ?', [email]);
    
    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }
    
    // Hash the password (using MD5 to match existing DB, but should use more secure methods in production)
    const hashedPassword = crypto
      .createHash('md5')
      .update(password)
      .digest('hex');
    
    // Insert new user
    const [result] = await db.query(
      'INSERT INTO users (FullName, Email, PasswordHash, RoleID) VALUES (?, ?, ?, ?)',
      [fullName, email, hashedPassword, roleId || 2]  // Default to role 2 (User) if not specified
    );
    
    if (result.affectedRows !== 1) {
      throw new Error('Failed to insert user');
    }
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      userId: result.insertId
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during registration'
    });
  }
};

