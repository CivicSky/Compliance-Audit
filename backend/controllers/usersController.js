const db = require('../db');
const crypto = require('crypto');


// Login user controller
exports.loginUser = async (req, res) => {
  try {
    console.log('Login attempt with:', req.body);
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
    
    console.log('Looking for user with email:', email);
    
    // Find user by email and password
    const [users] = await db.query(
      'SELECT UserID, FirstName, MiddleInitial, LastName, Email, RoleID, ProfilePic FROM users WHERE Email = ? AND PasswordHash = ?', 
      [email, hashedPassword]
    );
    
    console.log('Found users:', users.length);
    
    if (users.length === 0) {
      console.log('No user found with provided credentials');
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    console.log('User found, getting role...');
    
    // Get user role
    const [roles] = await db.query(
      'SELECT RoleName FROM roles WHERE RoleID = ?',
      [users[0].RoleID]
    );

    console.log('Role query result:', roles);

    // Return user data
    const userData = {
      ...users[0],
      FullName: `${users[0].FirstName}${users[0].MiddleInitial ? ' ' + users[0].MiddleInitial + '.' : ''} ${users[0].LastName}`,
      role: roles.length > 0 ? roles[0].RoleName : 'Unknown'
    };
    
    console.log('Login successful for user:', userData.Email);
    
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
    console.log('Registration attempt with data:', req.body);
    const { firstName, middleInitial, lastName, email, password, roleId } = req.body;
    
    console.log('Extracted fields:', { 
      firstName: firstName, 
      middleInitial: middleInitial, 
      lastName: lastName, 
      email: email, 
      password: password ? '***' : undefined,
      roleId: roleId 
    });
    
    // Validate inputs
    if (!firstName || !lastName || !email || !password) {
      console.log('Validation failed: Missing required fields');
      console.log('Missing fields check:', {
        firstName: !firstName ? 'MISSING' : 'OK',
        lastName: !lastName ? 'MISSING' : 'OK', 
        email: !email ? 'MISSING' : 'OK',
        password: !password ? 'MISSING' : 'OK'
      });
      return res.status(400).json({ 
        success: false, 
        message: 'First name, last name, email, and password are required' 
      });
    }

    // Combine names into FullName for the existing database structure
    console.log('Individual name fields:', { firstName, middleInitial, lastName });
    
    // Check if email already exists
    const [existingUsers] = await db.query('SELECT UserID FROM users WHERE Email = ?', [email]);
    
    if (existingUsers.length > 0) {
      console.log('Email already exists:', email);
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
    
    console.log('Attempting to insert user with:', { firstName, middleInitial, lastName, email, roleId: roleId || 2 });
    
    // Insert new user with separate name fields
    const [result] = await db.query(
      'INSERT INTO users (FirstName, MiddleInitial, LastName, Email, PasswordHash, RoleID) VALUES (?, ?, ?, ?, ?, ?)',
      [firstName, middleInitial || null, lastName, email, hashedPassword, roleId || 2]  // Default to role 2 (User) if not specified
    );
    
    console.log('Insert result:', result);
    
    if (result.affectedRows !== 1) {
      throw new Error('Failed to insert user');
    }
    
    console.log('User registered successfully with ID:', result.insertId);
    
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

// Get all users controller
exports.getUsers = async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT u.UserID, u.FirstName, u.MiddleInitial, u.LastName, u.Email, u.RoleID, u.ProfilePic, r.RoleName FROM users u LEFT JOIN roles r ON u.RoleID = r.RoleID'
    );
    
    // Add combined FullName to each user
    const usersWithFullName = users.map(user => ({
      ...user,
      FullName: `${user.FirstName}${user.MiddleInitial ? ' ' + user.MiddleInitial + '.' : ''} ${user.LastName}`
    }));
    
    res.json({
      success: true,
      users: usersWithFullName
    });
    
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching users'
    });
  }
};

// Get current user by email controller
exports.getCurrentUser = async (req, res) => {
  try {
    const { email } = req.params;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }
    
    console.log('Getting current user for email:', email);
    
    const [users] = await db.query(
      'SELECT u.UserID, u.FirstName, u.MiddleInitial, u.LastName, u.Email, u.RoleID, u.ProfilePic, r.RoleName FROM users u LEFT JOIN roles r ON u.RoleID = r.RoleID WHERE u.Email = ?',
      [email]
    );
    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const user = users[0];
    const userWithFullName = {
      ...user,
      FullName: `${user.FirstName}${user.MiddleInitial ? ' ' + user.MiddleInitial + '.' : ''} ${user.LastName}`
    };
    
    console.log('Current user found:', userWithFullName.FullName);
    
    res.json({
      success: true,
      user: userWithFullName
    });
    
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching current user'
    });
  }
};

