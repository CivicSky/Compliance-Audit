const db = require('../db');
const { recordLog } = require('./logsController');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { createNotifications } = require('../utils/notificationService');

// ===============================
// LOGIN USER (WITH JWT TOKEN)
// ===============================
exports.loginUser = async (req, res) => {
  try {
    console.log("Login attempt:", req.body);
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const hashedPassword = crypto
      .createHash("md5")
      .update(password)
      .digest("hex");

    // Find user
    const [users] = await db.query(
      "SELECT UserID, FirstName, MiddleInitial, LastName, Email, RoleID, ProfilePic, approval_status FROM users WHERE Email = ? AND PasswordHash = ?",
      [email, hashedPassword]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const user = users[0];

    // � Check approval status
    if (user.approval_status === 'pending') {
      return res.status(403).json({
        success: false,
        message: "Your account is pending approval. Please wait for admin approval.",
        approvalStatus: 'pending'
      });
    }

    if (user.approval_status === 'denied') {
      return res.status(403).json({
        success: false,
        message: "Your account has been denied. Please contact the administrator.",
        approvalStatus: 'denied'
      });
    }

    // �🔥 Create JWT
    const token = jwt.sign(
      { userId: user.UserID },
      "MY_SECRET_KEY", // ✔ change to env later
      { expiresIn: "7d" }
    );

    // Record successful login
    if (user && user.UserID) {
      try { recordLog(user.UserID, 'Login', `User ${user.Email} logged in`); } catch (e) {}
    }

    res.json({
      success: true,
      message: "Login successful",
      token,
      user,
    });

  } catch (error) {
    console.error("Login error:", error);
    // Do not log if no user ID is available
    res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
};

// LOGOUT USER (records audit entry)
exports.logoutUser = async (req, res) => {
  try {
    const userId = req.user?.userId || null;
    if (userId) {
      try { recordLog(userId, 'Logout', `User ${userId} logged out`); } catch (e) {}
    }
    res.json({ success: true, message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ success: false, message: 'Logout failed' });
  }
};


// ===============================
// REGISTER USER
// ===============================
exports.registerUser = async (req, res) => {
  try {
    const { firstName, middleInitial, lastName, email, password, roleId } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "First name, last name, email, and password are required",
      });
    }

    const [existingUsers] = await db.query(
      "SELECT UserID FROM users WHERE Email = ?",
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    const hashedPassword = crypto
      .createHash("md5")
      .update(password)
      .digest("hex");

    const [result] = await db.query(
      "INSERT INTO users (FirstName, MiddleInitial, LastName, Email, PasswordHash, RoleID) VALUES (?, ?, ?, ?, ?, ?)",
      [
        firstName,
        middleInitial || null,
        lastName,
        email,
        hashedPassword,
        roleId || 2,
      ]
    );

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      userId: result.insertId,
    });

    if (result && result.insertId) {
      try { recordLog(result.insertId, 'UserRegistered', `User registered: ${email}`); } catch (e) {}
    }

  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred during registration",
    });
  }
};


// ===============================
// GET ALL USERS
// ===============================
exports.getUsers = async (req, res) => {
  try {
    const [users] = await db.query(
      `SELECT
         u.UserID,
         u.FirstName,
         u.MiddleInitial,
         u.LastName,
         u.Email,
         u.RoleID,
         u.ProfilePic,
         u.approval_status,
         r.RoleName,
         reqOff.AssignedOffices AS RequirementAssignedOffices,
         perOff.AssignedOffices AS PersonnelAssignedOffices
       FROM users u
       LEFT JOIN roles r ON u.RoleID = r.RoleID
       LEFT JOIN (
         SELECT
           rua.UserID,
           GROUP_CONCAT(DISTINCT o.OfficeName ORDER BY o.OfficeName SEPARATOR '||') AS AssignedOffices
         FROM requirement_user_assignments rua
         LEFT JOIN offices o ON o.OfficeID = rua.OfficeID
         GROUP BY rua.UserID
       ) reqOff ON reqOff.UserID = u.UserID
       LEFT JOIN (
         SELECT
           h.UserID,
           GROUP_CONCAT(DISTINCT o.OfficeName ORDER BY o.OfficeName SEPARATOR '||') AS AssignedOffices
         FROM headofoffice h
         LEFT JOIN office_head_assignments oha ON oha.HeadID = h.HeadID
         LEFT JOIN offices o ON o.OfficeID = oha.OfficeID
         GROUP BY h.UserID
       ) perOff ON perOff.UserID = u.UserID`
    );

    const usersWithFullName = users.map((user) => ({
      ...user,
      FullName: `${user.FirstName}${user.MiddleInitial ? " " + user.MiddleInitial + "." : ""
        } ${user.LastName}`,
      AssignedOffices: Array.from(
        new Set(
          [
            ...String(user.RequirementAssignedOffices || '').split('||').filter(Boolean),
            ...String(user.PersonnelAssignedOffices || '').split('||').filter(Boolean)
          ]
        )
      ),
    }));

    res.json({
      success: true,
      users: usersWithFullName,
    });

  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching users",
    });
  }
};


// ===============================
// GET USER BY EMAIL
// ===============================
exports.getCurrentUser = async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const [users] = await db.query(
      "SELECT u.UserID, u.FirstName, u.MiddleInitial, u.LastName, u.Email, u.RoleID, u.ProfilePic, u.approval_status, r.RoleName FROM users u LEFT JOIN roles r ON u.RoleID = r.RoleID WHERE u.Email = ?",
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const user = users[0];
    const userWithFullName = {
      ...user,
      FullName: `${user.FirstName}${user.MiddleInitial ? " " + user.MiddleInitial + "." : ""
        } ${user.LastName}`,
    };

    res.json({
      success: true,
      user: userWithFullName,
    });

  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user",
    });
  }
};


// ===============================
// GET LOGGED-IN USER VIA TOKEN
// ===============================
exports.getLoggedInUser = async (req, res) => {
  try {
    const userId = req.user.userId; // from decoded token

    const [rows] = await db.query(
      "SELECT UserID, FirstName, MiddleInitial, LastName, Email, RoleID, ProfilePic, approval_status FROM users WHERE UserID = ?",
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      user: rows[0],
    });

  } catch (error) {
    console.error("getLoggedInUser error:", error);
    res.status(500).json({ success: false, message: "Error fetching user" });
  }
};

// ===============================
// UPDATE USER
// ===============================
exports.updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const tokenUserId = req.user.userId;

    if (parseInt(userId) !== tokenUserId) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const { FirstName, MiddleInitial, LastName, Email } = req.body;
    // Store only the filename if uploaded, like office head
    let ProfilePic = req.file ? req.file.filename : req.body.ProfilePic || null;

    const [result] = await db.query(
      `UPDATE users SET FirstName = ?, MiddleInitial = ?, LastName = ?, Email = ?, ProfilePic = ? WHERE UserID = ?`,
      [FirstName, MiddleInitial || null, LastName, Email, ProfilePic, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const [rows] = await db.query(
      "SELECT UserID, FirstName, MiddleInitial, LastName, Email, RoleID, ProfilePic, approval_status FROM users WHERE UserID = ?",
      [userId]
    );

    res.json({ success: true, user: rows[0] });
    try { recordLog(tokenUserId, 'UserUpdated', `User profile updated: ${tokenUserId}`); } catch (e) {}
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ success: false, message: "Error updating user" });
  }
};

// ===============================
// UPDATE USER APPROVAL STATUS
// ===============================
exports.updateApprovalStatus = async (req, res) => {
  try {
    const userId = req.params.id;
    const { approval_status } = req.body;

    // Validate approval_status
    if (!['approved', 'pending', 'denied'].includes(approval_status)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid approval status. Must be 'approved', 'pending', or 'denied'" 
      });
    }

    const [result] = await db.query(
      "UPDATE users SET approval_status = ? WHERE UserID = ?",
      [approval_status, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const [rows] = await db.query(
      "SELECT UserID, FirstName, MiddleInitial, LastName, Email, RoleID, ProfilePic, approval_status FROM users WHERE UserID = ?",
      [userId]
    );

    res.json({ 
      success: true, 
      message: `User approval status updated to ${approval_status}`,
      user: rows[0] 
    });
    if (req.user && req.user.userId) {
      try { recordLog(req.user.userId, 'UserApprovalUpdated', `User ${userId} approval set to ${approval_status}`); } catch (e) {}
    }
  } catch (error) {
    console.error("Update approval status error:", error);
    res.status(500).json({ success: false, message: "Error updating approval status" });
  }
};

// ===============================
// UPDATE USER ROLE
// ===============================
exports.updateUserRole = async (req, res) => {
  try {
    const userId = req.params.id;
    const { roleId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID is required" });
    }

    if (!roleId || ![1, 2].includes(parseInt(roleId))) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid role ID. Must be 1 (Admin) or 2 (User)" 
      });
    }

    const [[existingUser]] = await db.query(
      `SELECT u.UserID, u.FirstName, u.LastName, u.RoleID, r.RoleName
       FROM users u
       LEFT JOIN roles r ON r.RoleID = u.RoleID
       WHERE u.UserID = ?
       LIMIT 1`,
      [userId]
    );

    if (!existingUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const [result] = await db.query(
      "UPDATE users SET RoleID = ? WHERE UserID = ?",
      [roleId, userId]
    );

    const [rows] = await db.query(
      `SELECT u.UserID, u.FirstName, u.MiddleInitial, u.LastName, u.Email, u.RoleID, u.ProfilePic, u.approval_status, r.RoleName
       FROM users u
       LEFT JOIN roles r ON r.RoleID = u.RoleID
       WHERE u.UserID = ?`,
      [userId]
    );

    const updatedUser = rows[0];
    const oldRoleLabel = existingUser.RoleName || (Number(existingUser.RoleID) === 1 ? 'Admin' : 'User');
    const newRoleLabel = updatedUser?.RoleName || (Number(updatedUser?.RoleID) === 1 ? 'Admin' : 'User');

    if (req.user && req.user.userId && Number(existingUser.RoleID) !== Number(roleId)) {
      try {
        await createNotifications({
          userIds: [Number(userId)],
          adminId: req.user.userId,
          title: 'Role Updated',
          message: `Your role was changed from ${oldRoleLabel} to ${newRoleLabel}.`,
          type: 'announcement',
          relatedTable: 'users_role',
          relatedId: Number(userId),
        });
      } catch (notifError) {
        console.error('Failed to create role change notification:', notifError);
      }
    }

    res.json({ 
      success: true, 
      message: `User role updated to ${roleId === 1 ? 'Admin' : 'User'}`,
      user: updatedUser 
    });
    if (req.user && req.user.userId) {
      try { recordLog(req.user.userId, 'UserRoleUpdated', `User ${userId} role set to ${roleId}`); } catch (e) {}
    }
  } catch (error) {
    console.error("Update user role error:", error);
    res.status(500).json({ success: false, message: "Error updating user role" });
  }
};
