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
        allowAnyEmail: Boolean(decoded.allowAnyEmail),
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
  let allowAnyEmail = false;

  if (inviteToken) {
    const inviteResult = verifyInviteTokenPayload(inviteToken);
    if (!inviteResult.success) return inviteResult;

    const invite = inviteResult.invite;
    if (invite.email && invite.email !== email) {
      return { success: false, status: 403, message: 'This invite link is for a different email address' };
    }

    roleId = invite.roleId;
    if (invite.allowAnyEmail) allowAnyEmail = true;
  }

  if (!firstName || !lastName || !email || !password) {
    return { success: false, status: 400, message: 'First name, last name, email, and password are required' };
  }

  const isAuditor = Number(roleId) === 4;
  if (!isCompanyEmail(email) && !isAuditor && !allowAnyEmail) {
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

const generateOtpEmailHtml = (otp) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Auditrack Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 40px 15px;">
    <tr>
      <td align="center">
        <!-- Main Container Card -->
        <table role="presentation" width="100%" style="max-width: 500px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.07); border: 1px solid #e2e8f0; overflow: hidden;" cellspacing="0" cellpadding="0">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 32px 30px; text-align: center;">
              <table role="presentation" align="center" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding-bottom: 10px;">
                    <div style="display: inline-block; width: 44px; height: 44px; background-color: rgba(255, 255, 255, 0.2); border-radius: 12px; line-height: 44px; text-align: center; border: 1px solid rgba(255, 255, 255, 0.35);">
                      <span style="font-size: 22px; color: #ffffff; font-weight: bold;">&#10003;</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.3px;">Auditrack</h1>
                    <p style="margin: 4px 0 0 0; font-size: 11px; color: #bfdbfe; font-weight: 600; text-transform: uppercase; letter-spacing: 1.2px;">Compliance & Accreditation Portal</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 36px 32px 28px 32px;">
              <h2 style="margin: 0 0 10px 0; font-size: 18px; font-weight: 700; color: #0f172a; text-align: center;">
                Account Verification Code
              </h2>
              <p style="margin: 0 0 24px 0; font-size: 13px; line-height: 1.6; color: #64748b; text-align: center;">
                Thank you for registering on <strong>Auditrack</strong>. Use the 6-digit verification code below to verify your email and complete your setup.
              </p>

              <!-- Emphasized OTP Display Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px 0;">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; width: 100%; max-width: 360px; background: linear-gradient(180deg, #f8fafc 0%, #eff6ff 100%); border: 2px dashed #93c5fd; border-radius: 14px; padding: 18px 12px; text-align: center;">
                      <div style="font-family: 'Courier New', Consolas, Menlo, Monaco, monospace; font-size: 38px; font-weight: 900; letter-spacing: 10px; color: #1e40af; padding: 4px 0; margin-left: 10px;">
                        ${otp}
                      </div>
                      <div style="margin-top: 10px; display: inline-block; background-color: #dbeafe; color: #1e40af; font-size: 11px; font-weight: 700; padding: 3px 12px; border-radius: 20px;">
                        &#9201; Valid for 10 minutes
                      </div>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Security Notice -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 10px; border-left: 3px solid #3b82f6; padding: 12px 14px; margin-bottom: 22px;">
                <tr>
                  <td style="font-size: 12px; color: #475569; line-height: 1.5;">
                    <strong style="color: #1e293b;">Security Reminder:</strong> Never share your verification PIN with anyone. Auditrack will never ask for your PIN or password.
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.5;">
                If you did not make this request, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 30px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 3px 0; font-size: 11px; color: #64748b; font-weight: 600;">
                Auditrack Compliance Management System
              </p>
              <p style="margin: 0; font-size: 10px; color: #94a3b8;">
                La Consolacion College Bacolod • Automated System Message
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};

const sendOtpEmail = async (email, otp) => {
  let nodemailer;
  try {
    nodemailer = require('nodemailer');
  } catch (error) {
    console.warn('[OTP] nodemailer is not installed');
    return { sent: false, reason: 'nodemailer missing' };
  }

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER || process.env.GMAIL_USER;
  const pass = String(process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');

  if (!user || !pass) {
    return { sent: false, reason: 'SMTP is not configured' };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || `"Auditrack Compliance" <${user}>`,
      to: email,
      subject: `${otp} is your Auditrack verification code`,
      text: `Your Auditrack registration one-time PIN is ${otp}. It expires in 10 minutes.`,
      html: generateOtpEmailHtml(otp),
    });
    return { sent: true };
  } catch (error) {
    const errorMsg = error?.message || String(error);
    console.warn(`[OTP] Email send failed for ${email}:`, errorMsg);

    if (errorMsg.includes('534-5.7.9') || errorMsg.includes('Invalid login') || errorMsg.includes('WebLoginRequired')) {
      return {
        sent: false,
        reason: 'Gmail SMTP Authentication Failed (534-5.7.9). Please update the GMAIL_APP_PASSWORD in backend/.env with a valid 16-character Google App Password.',
      };
    }

    return { sent: false, reason: errorMsg || 'Failed to send email' };
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

    const inviteToken = String(body.inviteToken || '').trim();
    let allowAnyEmail = false;
    if (inviteToken) {
      const inviteResult = verifyInviteTokenPayload(inviteToken);
      if (inviteResult.success && inviteResult.invite?.allowAnyEmail) {
        allowAnyEmail = true;
      }
    }

    const isAuditor = Number(body.roleId) === 4;
    if (!isCompanyEmail(email) && !isAuditor && !allowAnyEmail && !pendingRegistrationStore.has(email)) {
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

    const isInvited = Boolean(registrationData.inviteToken);
    const initialApprovalStatus = isInvited ? 'approved' : 'pending';

    const roleId = Number(registrationData.roleId) || 2;
    const [result] = await db.query(
      'INSERT INTO users (FirstName, MiddleInitial, LastName, Email, PasswordHash, RoleID, approval_status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        registrationData.firstName,
        registrationData.middleInitial || null,
        registrationData.lastName,
        registrationData.email,
        registrationData.passwordHash,
        roleId,
        initialApprovalStatus,
      ]
    );

    const insertedUserId = result.insertId;

    // If registered as Personnel (RoleID 3) and approved, auto-create headofoffice entry
    if (roleId === 3 && initialApprovalStatus === 'approved') {
      try {
        const [existingHead] = await db.query('SELECT HeadID FROM headofoffice WHERE UserID = ? LIMIT 1', [insertedUserId]);
        if (existingHead.length === 0) {
          await db.query('INSERT INTO headofoffice (UserID, Position) VALUES (?, ?)', [insertedUserId, 'Personnel']);
        }
      } catch (headErr) {
        console.error('Failed to create headofoffice entry for new personnel:', headErr);
      }
    }

    pendingRegistrationStore.delete(email);

    try { recordLog(insertedUserId, 'UserRegistered', `User registered after OTP: ${email} (status: ${initialApprovalStatus})`); } catch (e) {}

    return res.json({
      success: true,
      isApproved: isInvited,
      message: isInvited
        ? 'Account registered and verified successfully. You can now log in.'
        : 'Email verified. Your account is pending approval.',
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
    const allowAnyEmail = Boolean(req.body?.allowAnyEmail);

    if (email && !isCompanyEmail(email) && roleId !== 4 && !allowAnyEmail) {
      return res.status(400).json({
        success: false,
        message: `Only ${COMPANY_EMAIL_DOMAIN} email addresses can register`,
      });
    }

    const payload = {
      type: 'registration_invite',
      roleId,
      allowAnyEmail,
      createdBy: req.user?.userId || null,
    };

    if (email) payload.email = email;

    const token = jwt.sign(payload, INVITE_TOKEN_SECRET, { expiresIn: '10m' });
    const decoded = jwt.decode(token) || {};
    const requestOrigin = req.get('origin');
    const fallbackFrontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const frontendUrl = String(requestOrigin || fallbackFrontendUrl).replace(/\/$/, '');
    const registerPath = roleId === 4 ? '/register-auditor' : '/register';
    const inviteUrl = `${frontendUrl}${registerPath}?invite=${encodeURIComponent(token)}`;

    res.json({
      success: true,
      inviteUrl,
      token,
      allowAnyEmail,
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
// LOGIN USER (WITH JWT TOKEN)
// ===============================
exports.loginUser = async (req, res) => {
  try {
    console.log("Login attempt:", req.body);
    const { email, password } = req.body;

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

    const token = jwt.sign(
      { userId: user.UserID, roleId: user.RoleID },
      "MY_SECRET_KEY",
      { expiresIn: "8h" }
    );

    if (user && user.UserID) {
      try { recordLog(user.UserID, 'Login', `User ${user.Email} logged in`); } catch (e) {}
    }

    try { loginRateLimiter.reset(email, req.ip); } catch (e) {}

    res.json({
      success: true,
      message: "Login successful.",
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
         perOff.AssignedOffices AS PersonnelAssignedOffices,
         audAreas.AssignedAreas AS assignedArea
       FROM users u
       LEFT JOIN roles r ON u.RoleID = r.RoleID
       LEFT JOIN (
         SELECT
           rua.UserID,
           string_agg(DISTINCT o.OfficeName, '||' ORDER BY o.OfficeName) AS AssignedOffices
         FROM requirement_user_assignments rua
         LEFT JOIN offices o ON o.OfficeID = rua.OfficeID
         GROUP BY rua.UserID
       ) reqOff ON reqOff.UserID = u.UserID
       LEFT JOIN (
         SELECT
           h.UserID,
           string_agg(DISTINCT o.OfficeName, '||' ORDER BY o.OfficeName) AS AssignedOffices
         FROM headofoffice h
         LEFT JOIN office_head_assignments oha ON oha.HeadID = h.HeadID
         LEFT JOIN offices o ON o.OfficeID = oha.OfficeID
         GROUP BY h.UserID
       ) perOff ON perOff.UserID = u.UserID
       LEFT JOIN (
         SELECT
           aaa.auditor_user_id AS UserID,
           string_agg(DISTINCT CONCAT(ar.AreaCode, ': ', ar.AreaName), ', ' ORDER BY CONCAT(ar.AreaCode, ': ', ar.AreaName)) AS AssignedAreas
         FROM auditor_area_assignments aaa
         JOIN areas ar ON aaa.area_id = ar.AreaID
         GROUP BY aaa.auditor_user_id
       ) audAreas ON audAreas.UserID = u.UserID`
    );

    const usersWithFullName = users.map((user) => {
      const first = user.FirstName || user.firstname || '';
      const middle = user.MiddleInitial || user.middleinitial ? ` ${user.MiddleInitial || user.middleinitial}.` : '';
      const last = user.LastName || user.lastname || '';
      const area = user.assignedArea || user.assignedarea || user.AssignedAreas || user.assignedareas || null;

      return {
        ...user,
        UserID: user.UserID ?? user.userid ?? user.id,
        FirstName: first,
        MiddleInitial: user.MiddleInitial || user.middleinitial || null,
        LastName: last,
        FullName: `${first}${middle} ${last}`.trim() || 'Unknown',
        assignedArea: area,
        AssignedOffices: Array.from(
          new Set([
            ...String(user.RequirementAssignedOffices || user.requirementassignedoffices || '').split('||').filter(Boolean),
            ...String(user.PersonnelAssignedOffices || user.personnelassignedoffices || '').split('||').filter(Boolean),
          ])
        ),
      };
    });

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

exports.getLoggedInUser = async (req, res) => {
  try {
    const userId = req.user.userId; // from decoded token

    const [rows] = await db.query(
      `SELECT u.UserID, u.FirstName, u.MiddleInitial, u.LastName, u.Email, u.RoleID, u.ProfilePic, u.approval_status, r.RoleName,
              audAreas.AssignedAreas AS assignedArea
       FROM users u
       LEFT JOIN roles r ON u.RoleID = r.RoleID
       LEFT JOIN (
         SELECT
           aaa.auditor_user_id AS UserID,
           string_agg(DISTINCT CONCAT(ar.AreaCode, ': ', ar.AreaName), ', ' ORDER BY CONCAT(ar.AreaCode, ': ', ar.AreaName)) AS AssignedAreas
         FROM auditor_area_assignments aaa
         JOIN areas ar ON aaa.area_id = ar.AreaID
         GROUP BY aaa.auditor_user_id
       ) audAreas ON audAreas.UserID = u.UserID
       WHERE u.UserID = ?`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const row = rows[0];
    const userObj = {
      ...row,
      UserID: row.UserID ?? row.userid ?? row.id,
      FirstName: row.FirstName || row.firstname || '',
      MiddleInitial: row.MiddleInitial || row.middleinitial || null,
      LastName: row.LastName || row.lastname || '',
      assignedArea: row.assignedArea || row.assignedarea || row.AssignedAreas || row.assignedareas || null,
    };

    res.json({
      success: true,
      user: userObj,
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
    let ProfilePic = req.file ? req.file.filename : req.body.ProfilePic || null;

    if (req.file) {
      try {
        const { uploadToSupabaseBucket } = require('../utils/supabaseStorage');
        await uploadToSupabaseBucket(req.file.path, req.file.filename, req.file.mimetype, 'profile-pics');
      } catch (sErr) {
        console.warn('Profile pic cloud upload notice:', sErr.message);
      }
    }

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
