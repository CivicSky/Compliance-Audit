const db = require('../db');
const { recordLog } = require('./logsController');
const loginRateLimiter = require('../middleware/loginRateLimiter');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { createNotifications } = require('../utils/notificationService');
const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const COMPANY_EMAIL_DOMAIN = '@lccbonline.edu.ph';
const isCompanyEmail = (email) => normalizeEmail(email).endsWith(COMPANY_EMAIL_DOMAIN);
const pendingRegistrationStore = new Map();
const OTP_TTL_MS = 10 * 60 * 1000;
const INVITE_TTL_MS = 10 * 60 * 1000;
const JWT_SECRET = process.env.JWT_SECRET || 'MY_SECRET_KEY';
const INVITE_TOKEN_SECRET = process.env.INVITE_TOKEN_SECRET || JWT_SECRET;

const hashValue = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');

const verifyInviteTokenPayload = (token) => {
  if (!token) {
    return { success: false, status: 400, message: 'Invite token is required' };
  }

  try {
    const decoded = jwt.verify(token, INVITE_TOKEN_SECRET);
    if (decoded?.type !== 'registration_invite') {
      return { success: false, status: 400, message: 'Invalid invite link' };
    }

    const roleId = Number.parseInt(decoded.roleId, 10) || 2;
    return {
      success: true,
      invite: {
        email: decoded.email ? normalizeEmail(decoded.email) : null,
        roleId,
        expiresAt: decoded.exp ? decoded.exp * 1000 : Date.now() + INVITE_TTL_MS,
      },
    };
  } catch (error) {
    const isExpired = error?.name === 'TokenExpiredError';
    return {
      success: false,
      status: isExpired ? 410 : 400,
      message: isExpired ? 'Invite link expired' : 'Invalid invite link',
    };
  }
};

const cleanExpiredPendingRegistrations = () => {
  const now = Date.now();
  for (const [email, entry] of pendingRegistrationStore.entries()) {
    if (!entry || entry.expiresAt <= now) pendingRegistrationStore.delete(email);
  }
};

const createPendingRegistration = async (registrationData) => {
  const firstName = String(registrationData.firstName || '').trim();
  const middleInitial = String(registrationData.middleInitial || '').trim();
  const lastName = String(registrationData.lastName || '').trim();
  const password = String(registrationData.password || '');
  const email = normalizeEmail(registrationData.email);
  const inviteToken = String(registrationData.inviteToken || '').trim();
  let roleId = Number.parseInt(registrationData.roleId, 10) || 2;

  if (inviteToken) {
    const inviteResult = verifyInviteTokenPayload(inviteToken);
    if (!inviteResult.success) return inviteResult;

    const invite = inviteResult.invite;
    if (invite.email && invite.email !== email) {
      return { success: false, status: 403, message: 'This invite link is for a different email address' };
    }

    roleId = invite.roleId;
  }

  if (!firstName || !lastName || !email || !password) {
    return { success: false, status: 400, message: 'First name, last name, email, and password are required' };
  }

  if (!isCompanyEmail(email)) {
    return { success: false, status: 400, message: `Only ${COMPANY_EMAIL_DOMAIN} email addresses can register` };
  }

  const [existingUsers] = await db.query('SELECT UserID FROM users WHERE Email = ?', [email]);
  if (existingUsers.length > 0) {
    return { success: false, status: 400, message: 'Email already registered' };
  }

  const otp = crypto.randomInt(100000, 1000000).toString();
  pendingRegistrationStore.set(email, {
    registrationData: {
      firstName,
      middleInitial: middleInitial || null,
      lastName,
      email,
      passwordHash: crypto.createHash('md5').update(password).digest('hex'),
      roleId,
      inviteToken: inviteToken || null,
    },
    otpHash: hashValue(otp),
    attempts: 0,
    expiresAt: Date.now() + OTP_TTL_MS,
  });

  return { success: true, email, otp, roleId };
};

const sendOtpEmail = async (email, otp) => {
  let nodemailer;
  try {
    nodemailer = require('nodemailer');
  } catch (error) {
    console.warn('[OTP] nodemailer is not installed');
    return { sent: false, reason: 'nodemailer missing' };
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER || process.env.GMAIL_USER;
  const pass = String(process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');

  if (!user || !pass) {
    return { sent: false, reason: 'SMTP is not configured' };
  }

  const transporter = host
    ? nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      })
    : nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
      });

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || user,
      to: email,
      subject: 'Your Auditrack registration OTP',
      text: `Your Auditrack registration one-time PIN is ${otp}. It expires in 10 minutes.`,
      html: `<p>Your Auditrack registration one-time PIN is <strong>${otp}</strong>.</p><p>It expires in 10 minutes.</p>`,
    });
    return { sent: true };
  } catch (error) {
    console.warn(`[OTP] Email send failed for ${email}:`, error?.message || error);
    return { sent: false, reason: error?.message || 'Failed to send email' };
  }
};

// ===============================
// LOGIN USER (WITH JWT TOKEN)
// ===============================
exports.loginUser = async (req, res) => {
  try {
    console.log("Login attempt:", req.body);
    const { email, password } = req.body;

    // rate limit check (email + IP)
    const remainingMs = loginRateLimiter.getRemainingMs(email, req.ip);
    if (remainingMs && remainingMs > 0) {
      const totalSeconds = Math.ceil(remainingMs / 1000);
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;
      const mmss = `${mins}:${String(secs).padStart(2, '0')}`;
      return res.status(429).json({
        success: false,
        message: `Too many failed login attempts. Please wait ${mmss} before retrying.`,
        remainingMs
      });
    }

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
      const result = loginRateLimiter.recordFailure(email, req.ip);
      if (result.blocked) {
        const totalSeconds = Math.ceil(result.remainingMs / 1000);
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        const mmss = `${mins}:${String(secs).padStart(2, '0')}`;
        return res.status(429).json({
          success: false,
          message: `Too many failed login attempts. Please wait ${mmss} before retrying.`,
          remainingMs: result.remainingMs
        });
      }
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

    // Reset any rate limiting state on successful login
    try { loginRateLimiter.reset(email, req.ip); } catch (e) {}

    res.json({
      success: true,
      message: "Login successful. Failed attempt counter reset.",
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


// CHECK LOGIN STATUS (remaining block time)
exports.loginStatus = async (req, res) => {
  try {
    const email = String(req.query.email || '').trim();
    if (!email) {
      return res.json({ success: true, remainingMs: 0 });
    }

    const remainingMs = loginRateLimiter.getRemainingMs(email, req.ip) || 0;
    if (remainingMs && remainingMs > 0) {
      const totalSeconds = Math.ceil(remainingMs / 1000);
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;
      const mmss = `${mins}:${String(secs).padStart(2, '0')}`;
      return res.json({
        success: true,
        remainingMs,
        message: `Too many failed login attempts. Please wait ${mmss} before retrying.`
      });
    }

    return res.json({ success: true, remainingMs: 0 });
  } catch (error) {
    console.error('loginStatus error:', error);
    return res.status(500).json({ success: false, message: 'Failed to check login status' });
  }
};


exports.sendRegistrationOtp = async (req, res) => {
  try {
    const body = req.body || {};
    const email = normalizeEmail(body.email);
    const hasRegistrationPayload = Boolean(body.firstName || body.lastName || body.password);

    cleanExpiredPendingRegistrations();

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    if (!isCompanyEmail(email)) {
      return res.status(400).json({
        success: false,
        message: `Only ${COMPANY_EMAIL_DOMAIN} email addresses can register`,
      });
    }

    if (hasRegistrationPayload) {
      const result = await createPendingRegistration(body);
      if (!result.success) {
        return res.status(result.status || 400).json({ success: false, message: result.message });
      }

      const otpResult = await sendOtpEmail(email, result.otp);
      if (!otpResult.sent) {
        pendingRegistrationStore.delete(email);
        return res.status(502).json({
          success: false,
          message: otpResult.reason ? `Failed to send OTP email: ${otpResult.reason}` : 'Failed to send OTP email.',
          email,
        });
      }

      return res.status(200).json({
        success: true,
        message: 'OTP sent to your email.',
        email,
        emailDelivery: 'sent',
      });
    }

    const pending = pendingRegistrationStore.get(email);
    if (!pending) {
      return res.status(400).json({
        success: false,
        message: 'Registration data not found. Please submit the form again.',
      });
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    pending.otpHash = hashValue(otp);
    pending.attempts = 0;
    pending.expiresAt = Date.now() + OTP_TTL_MS;
    pendingRegistrationStore.set(email, pending);

    const otpResult = await sendOtpEmail(email, otp);
    if (!otpResult.sent) {
      pendingRegistrationStore.delete(email);
      return res.status(502).json({
        success: false,
        message: otpResult.reason ? `Failed to send OTP email: ${otpResult.reason}` : 'Failed to send OTP email.',
        email,
      });
    }

    res.status(201).json({
      success: true,
      email,
      message: 'OTP sent to your email.',
      emailDelivery: 'sent',
    });

  } catch (error) {
    console.error('Send registration OTP error:', error?.stack || error);
    res.status(500).json({
      success: false,
      message: error?.message || String(error) || 'Failed to send one-time PIN',
    });
  }
};

exports.verifyRegistrationOtp = async (req, res) => {
  try {
    cleanExpiredPendingRegistrations();
    const body = req.body || {};
    const email = normalizeEmail(body.email);
    const otp = String(body.otp || '').trim();

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and one-time PIN are required' });
    }

    const pending = pendingRegistrationStore.get(email);
    if (!pending || pending.expiresAt <= Date.now()) {
      pendingRegistrationStore.delete(email);
      return res.status(400).json({ success: false, message: 'One-time PIN expired. Please request a new one.' });
    }

    if (pending.attempts >= 5) {
      pendingRegistrationStore.delete(email);
      return res.status(429).json({ success: false, message: 'Too many wrong OTP attempts. Please request a new one.' });
    }

    if (pending.otpHash !== hashValue(otp)) {
      pending.attempts += 1;
      pendingRegistrationStore.set(email, pending);
      return res.status(400).json({ success: false, message: 'Wrong OTP. Please check your email and try again.' });
    }

    const registrationData = pending.registrationData;
    if (registrationData.inviteToken) {
      const inviteResult = verifyInviteTokenPayload(registrationData.inviteToken);
      if (!inviteResult.success) {
        pendingRegistrationStore.delete(email);
        return res.status(inviteResult.status || 400).json({
          success: false,
          message: inviteResult.message || 'Invite link expired or invalid',
        });
      }

      const invite = inviteResult.invite;
      if (invite.email && invite.email !== email) {
        pendingRegistrationStore.delete(email);
        return res.status(403).json({ success: false, message: 'This invite link is for a different email address' });
      }
    }

    const [existingUsers] = await db.query('SELECT UserID FROM users WHERE Email = ?', [email]);
    if (existingUsers.length > 0) {
      pendingRegistrationStore.delete(email);
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const [result] = await db.query(
      'INSERT INTO users (FirstName, MiddleInitial, LastName, Email, PasswordHash, RoleID, approval_status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        registrationData.firstName,
        registrationData.middleInitial || null,
        registrationData.lastName,
        registrationData.email,
        registrationData.passwordHash,
        registrationData.roleId || 2,
        'pending',
      ]
    );

    pendingRegistrationStore.delete(email);

    try { recordLog(result.insertId, 'UserRegistered', `User registered after OTP: ${email}`); } catch (e) {}

    return res.json({
      success: true,
      message: 'Email verified. Your account is pending approval.',
      userId: result.insertId,
      email,
    });
  } catch (error) {
    console.error('Verify registration OTP error:', error?.stack || error);
    res.status(500).json({ success: false, message: error?.message || 'Failed to verify one-time PIN' });
  }
};

exports.registerUser = async (req, res) => {
  return exports.sendRegistrationOtp(req, res);
};

exports.createRegistrationInvite = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const roleId = Number.parseInt(req.body?.roleId, 10) || 3;

    if (email && !isCompanyEmail(email)) {
      return res.status(400).json({
        success: false,
        message: `Only ${COMPANY_EMAIL_DOMAIN} email addresses can register`,
      });
    }

    const payload = {
      type: 'registration_invite',
      roleId,
      createdBy: req.user?.userId || null,
    };

    if (email) payload.email = email;

    const token = jwt.sign(payload, INVITE_TOKEN_SECRET, { expiresIn: '10m' });
    const decoded = jwt.decode(token) || {};
    const requestOrigin = req.get('origin');
    const fallbackFrontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const frontendUrl = String(requestOrigin || fallbackFrontendUrl).replace(/\/$/, '');
    const inviteUrl = `${frontendUrl}/register?invite=${encodeURIComponent(token)}`;

    res.json({
      success: true,
      inviteUrl,
      token,
      expiresAt: decoded.exp ? decoded.exp * 1000 : Date.now() + INVITE_TTL_MS,
      roleId,
      email: email || null,
    });
  } catch (error) {
    console.error('Create registration invite error:', error);
    res.status(500).json({ success: false, message: 'Failed to create invite link' });
  }
};

exports.validateRegistrationInvite = async (req, res) => {
  try {
    const token = String(req.params.token || req.query.token || '').trim();
    const inviteResult = verifyInviteTokenPayload(token);

    if (!inviteResult.success) {
      return res.status(inviteResult.status || 400).json({
        success: false,
        message: inviteResult.message || 'Invite link expired or invalid',
      });
    }

    res.json({
      success: true,
      invite: inviteResult.invite,
    });
  } catch (error) {
    console.error('Validate registration invite error:', error);
    res.status(500).json({ success: false, message: 'Failed to validate invite link' });
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
      FullName: `${user.FirstName}${user.MiddleInitial ? " " + user.MiddleInitial + "." : ""} ${user.LastName}`,
      AssignedOffices: Array.from(
        new Set([
          ...String(user.RequirementAssignedOffices || '').split('||').filter(Boolean),
          ...String(user.PersonnelAssignedOffices || '').split('||').filter(Boolean),
        ])
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
      FullName: `${user.FirstName}${user.MiddleInitial ? " " + user.MiddleInitial + "." : ""} ${user.LastName}`,
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
    // If the user was denied, remove their related records and delete the user
    if (approval_status === 'denied') {
      try {
        // cleanup assignments and headofoffice entries
        await db.query('DELETE FROM requirement_user_assignments WHERE UserID = ?', [userId]);
        await db.query('DELETE FROM headofoffice WHERE UserID = ?', [userId]);
        const [delResult] = await db.query('DELETE FROM users WHERE UserID = ?', [userId]);
        try { recordLog(req.user.userId, 'UserDeniedDeleted', `User ${userId} denied and deleted`); } catch (e) {}
        return res.json({ success: true, message: `User denied and deleted`, deletedRows: delResult.affectedRows });
      } catch (cleanupErr) {
        console.error('Failed to cleanup/delete denied user:', cleanupErr);
        return res.status(500).json({ success: false, message: 'Failed to delete denied user' });
      }
    }

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

// ===============================
// DELETE USERS (bulk)
// ===============================
exports.deleteUsers = async (req, res) => {
  try {
    const adminId = req.user && req.user.userId;
    if (!adminId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    // Verify admin
    const [[adminRow]] = await db.query('SELECT RoleID FROM users WHERE UserID = ?', [adminId]);
    if (!adminRow || Number(adminRow.RoleID) !== 1) {
      return res.status(403).json({ success: false, message: 'Only admins can delete users' });
    }

    const ids = Array.isArray(req.body.ids) ? req.body.ids.map((v) => Number(v)) : [];
    if (!ids || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No user IDs provided' });
    }

    // Prevent deleting the requesting admin
    if (ids.includes(adminId)) {
      return res.status(400).json({ success: false, message: 'Cannot delete the currently authenticated user' });
    }

    const placeholders = ids.map(() => '?').join(',');

    // Remove assignments and related records referencing these users
    await db.query(`DELETE FROM requirement_user_assignments WHERE UserID IN (${placeholders})`, ids);
    await db.query(`DELETE FROM headofoffice WHERE UserID IN (${placeholders})`, ids);

    // Finally delete from users
    const [result] = await db.query(`DELETE FROM users WHERE UserID IN (${placeholders})`, ids);

    try { recordLog(adminId, 'DeleteUsers', `Deleted users: ${ids.join(',')}`); } catch (e) {}

    res.json({ success: true, message: `Deleted ${result.affectedRows} user(s)` });
  } catch (error) {
    console.error('deleteUsers error:', error);
    res.status(500).json({ success: false, message: 'Error deleting users' });
  }
};
