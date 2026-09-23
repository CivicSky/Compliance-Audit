const db = require('../db');

const ALLOWED_TYPES = new Set(['info', 'success', 'warning', 'error', 'announcement']);
const META_TAG = '[[meta:';
const META_END = ']]';

const normalizeUserIds = (userIds = []) => {
  if (!Array.isArray(userIds)) return [];
  return [...new Set(userIds.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0))];
};

const appendMeta = (message, meta) => {
  const text = String(message || '').trim();
  if (!meta || typeof meta !== 'object' || Object.keys(meta).length === 0) return text;
  return `${text}\n${META_TAG}${JSON.stringify(meta)}${META_END}`;
};

const parseMetaFromMessage = (message) => {
  const raw = String(message || '');
  const start = raw.lastIndexOf(META_TAG);
  if (start === -1) return { text: raw.trim(), meta: null };

  const end = raw.indexOf(META_END, start);
  if (end === -1) return { text: raw.trim(), meta: null };

  try {
    const meta = JSON.parse(raw.slice(start + META_TAG.length, end));
    return { text: raw.slice(0, start).trim(), meta };
  } catch {
    return { text: raw.trim(), meta: null };
  }
};

const createNotifications = async ({
  userIds = [],
  adminId,
  title,
  message,
  type = 'info',
  relatedTable = null,
  relatedId = null,
  meta = null,
}) => {
  const recipients = normalizeUserIds(userIds);
  let senderId = Number(adminId);
  if (!Number.isInteger(senderId) || senderId <= 0) {
    try {
      const [adminRows] = await db.query(`SELECT UserID FROM users WHERE RoleID = 1 ORDER BY UserID ASC LIMIT 1`);
      senderId = adminRows[0]?.UserID || null;
    } catch (e) {
      senderId = null;
    }
  }

  if (recipients.length === 0 || !title || !message) {
    return { inserted: 0, skipped: recipients.length };
  }

  const normalizedType = ALLOWED_TYPES.has(type) ? type : 'info';
  const finalMessage = appendMeta(message, meta);

  for (const userId of recipients) {
    try {
      await db.query(
        `INSERT INTO notifications
          (UserID, AdminID, Title, Message, Type, RelatedTable, RelatedID, IsRead, CreatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, FALSE, NOW())`,
        [userId, senderId, String(title).trim(), finalMessage, normalizedType, relatedTable || null, relatedId || null]
      );
    } catch (err) {
      console.error(`Error inserting notification for user #${userId}:`, err.message);
    }
  }

  try {
    const { emitDataChange } = require('../socket');
    emitDataChange('notifications', {
      userIds: recipients,
      title: String(title).trim(),
      type: normalizedType,
    });
  } catch (socketErr) {
    // Non-fatal if socket not ready
  }

  return { inserted: recipients.length, skipped: 0 };
};

const getAdminUserIds = async () => {
  const [rows] = await db.query('SELECT UserID FROM users WHERE RoleID = 1');
  return rows.map((row) => Number(row.UserID)).filter((id) => Number.isInteger(id) && id > 0);
};

module.exports = {
  createNotifications,
  appendMeta,
  parseMetaFromMessage,
  getAdminUserIds,
};
