const db = require('../db');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

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
      "SELECT UserID, FirstName, MiddleInitial, LastName, Email, RoleID, ProfilePic FROM users WHERE Email = ? AND PasswordHash = ?",
      [email, hashedPassword]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const user = users[0];

    // 🔥 Create JWT
    const token = jwt.sign(
      { userId: user.UserID },
      "MY_SECRET_KEY", // ✔ change to env later
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      message: "Login successful",
      token,
      user,
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed",
    });
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
      "SELECT u.UserID, u.FirstName, u.MiddleInitial, u.LastName, u.Email, u.RoleID, u.ProfilePic, r.RoleName FROM users u LEFT JOIN roles r ON u.RoleID = r.RoleID"
    );

    const usersWithFullName = users.map((user) => ({
      ...user,
      FullName: `${user.FirstName}${user.MiddleInitial ? " " + user.MiddleInitial + "." : ""
        } ${user.LastName}`,
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
      "SELECT u.UserID, u.FirstName, u.MiddleInitial, u.LastName, u.Email, u.RoleID, u.ProfilePic, r.RoleName FROM users u LEFT JOIN roles r ON u.RoleID = r.RoleID WHERE u.Email = ?",
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
      "SELECT UserID, FirstName, MiddleInitial, LastName, Email, RoleID, ProfilePic FROM users WHERE UserID = ?",
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
      "SELECT UserID, FirstName, MiddleInitial, LastName, Email, RoleID, ProfilePic FROM users WHERE UserID = ?",
      [userId]
    );

    res.json({ success: true, user: rows[0] });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ success: false, message: "Error updating user" });
  }
};

