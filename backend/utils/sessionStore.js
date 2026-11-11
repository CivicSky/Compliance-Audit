const crypto = require('crypto');
const db = require('../db');

// In-memory cache of active session IDs: Map<number (userid), string | null (sid)>
const activeSessions = new Map();
let schemaEnsured = false;

async function ensureSessionColumn() {
  if (schemaEnsured) return;
  try {
    await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS activesessionid VARCHAR(128)');
    schemaEnsured = true;
  } catch (err) {
    console.warn('Could not ensure users.activesessionid column:', err.message || err);
  }
}

// Run migration check on startup
ensureSessionColumn();

/**
 * Creates and records a new single-active-session ID for a user,
 * invalidating any previous session ID for that user.
 * @param {number|string} userid
 * @returns {Promise<string>} The newly generated session ID (sid)
 */
async function createSession(userid) {
  const numericUserId = Number(userid);
  const sid = crypto.randomBytes(16).toString('hex');

  activeSessions.set(numericUserId, sid);

  try {
    await ensureSessionColumn();
    await db.query('UPDATE users SET activesessionid = ? WHERE userid = ?', [sid, numericUserId]);
  } catch (err) {
    console.warn('Could not persist activesessionid to DB:', err.message || err);
  }

  return sid;
}

/**
 * Clears the active session for a user (on logout), only if expectedSid matches (or is omitted).
 * @param {number|string} userid
 * @param {string} [expectedSid]
 */
async function clearSession(userid, expectedSid) {
  const numericUserId = Number(userid);
  if (!numericUserId) return;

  const currentMemSid = activeSessions.get(numericUserId);
  if (expectedSid && currentMemSid && currentMemSid !== expectedSid) {
    // Another session already replaced this one; do not clear the newer session
    return;
  }

  activeSessions.set(numericUserId, null);

  try {
    await ensureSessionColumn();
    if (expectedSid) {
      await db.query(
        'UPDATE users SET activesessionid = NULL WHERE userid = ? AND (activesessionid = ? OR activesessionid IS NULL)',
        [numericUserId, expectedSid]
      );
    } else {
      await db.query('UPDATE users SET activesessionid = NULL WHERE userid = ?', [numericUserId]);
    }
  } catch (err) {
    console.warn('Could not clear activesessionid in DB:', err.message || err);
  }
}

/**
 * Verifies whether a token's session ID matches the user's currently active session.
 * @param {number|string} userid
 * @param {string|undefined} tokenSid
 * @returns {Promise<{ valid: boolean, reason?: string, roleid?: number }>}
 */
async function verifySession(userid, tokenSid) {
  const numericUserId = Number(userid);
  if (!numericUserId) {
    return { valid: false, reason: 'INVALID_USER' };
  }

  let currentSid = activeSessions.get(numericUserId);
  let roleid;

  // Hydrate from DB on first check after server restart
  if (currentSid === undefined) {
    try {
      await ensureSessionColumn();
      const [[row]] = await db.query(
        'SELECT activesessionid, roleid FROM users WHERE userid = ?',
        [numericUserId]
      );
      if (!row) {
        return { valid: false, reason: 'USER_NOT_FOUND' };
      }
      roleid = row.roleid ? Number(row.roleid) : undefined;
      currentSid = row.activesessionid || undefined;
      if (currentSid) {
        activeSessions.set(numericUserId, currentSid);
      }
    } catch (err) {
      // If DB check fails transiently, allow request to proceed rather than false-positive logout
      return { valid: true };
    }
  }

  // If the user explicitly logged out
  if (currentSid === null) {
    return { valid: false, reason: 'SESSION_ENDED', roleid };
  }

  // If an active session ID is recorded, the token MUST carry a matching sid
  if (currentSid) {
    if (!tokenSid || tokenSid !== currentSid) {
      return { valid: false, reason: 'SESSION_REPLACED', roleid };
    }
    return { valid: true, roleid };
  }

  // Legacy token before first re-login after upgrade: adopt tokenSid if present
  if (tokenSid) {
    activeSessions.set(numericUserId, tokenSid);
    db.query('UPDATE users SET activesessionid = ? WHERE userid = ?', [tokenSid, numericUserId]).catch(() => {});
  }

  return { valid: true, roleid };
}

module.exports = {
  createSession,
  clearSession,
  verifySession,
};

