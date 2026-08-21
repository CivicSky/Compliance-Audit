const jwt = require("jsonwebtoken");
const db = require("../db");

// Standard JWT Authentication Middleware
const auth = async function (req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ success: false, message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ success: false, message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, "MY_SECRET_KEY");
    req.user = decoded; // Contains userId and roleId if signed with roleId

    // Fallback: If roleId is missing from token payload, fetch from DB
    if (!req.user.roleId && req.user.userId) {
      const [[userRow]] = await db.query("SELECT RoleID FROM users WHERE UserID = ?", [req.user.userId]);
      if (userRow) {
        req.user.roleId = Number(userRow.RoleID);
      }
    }

    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Session expired or invalid token" });
  }
};

// Middleware to restrict Auditor (RoleID === 4) from making structural changes (create, edit, delete)
const restrictAuditor = async function (req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  let roleId = Number(req.user.roleId);
  if (!roleId && req.user.userId) {
    const [[userRow]] = await db.query("SELECT RoleID FROM users WHERE UserID = ?", [req.user.userId]);
    if (userRow) roleId = Number(userRow.RoleID);
  }

  if (roleId === 4) {
    return res.status(403).json({
      success: false,
      message: "Forbidden: External Auditors are not permitted to modify compliance structures or records.",
    });
  }

  next();
};

// Middleware to restrict Auditor (RoleID === 4) from downloading files
const restrictAuditorDownloads = async function (req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  let roleId = Number(req.user.roleId);
  if (!roleId && req.user.userId) {
    const [[userRow]] = await db.query("SELECT RoleID FROM users WHERE UserID = ?", [req.user.userId]);
    if (userRow) roleId = Number(userRow.RoleID);
  }

  if (roleId === 4) {
    return res.status(403).json({
      success: false,
      message: "Forbidden: File downloading is restricted for Auditors.",
    });
  }

  next();
};

// Middleware to require Admin (RoleID === 1) access
const requireAdmin = async function (req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  let roleId = Number(req.user.roleId);
  if (!roleId && req.user.userId) {
    const [[userRow]] = await db.query("SELECT RoleID FROM users WHERE UserID = ?", [req.user.userId]);
    if (userRow) roleId = Number(userRow.RoleID);
  }

  if (roleId !== 1) {
    return res.status(403).json({
      success: false,
      message: "Forbidden: Administrator access required.",
    });
  }

  next();
};

module.exports = auth;
module.exports.auth = auth;
module.exports.restrictAuditor = restrictAuditor;
module.exports.restrictAuditorDownloads = restrictAuditorDownloads;
module.exports.requireAdmin = requireAdmin;
