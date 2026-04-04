const db = require('../db');

const ALLOWED_TYPES = new Set(['info', 'success', 'warning', 'error', 'announcement']);

const normalizeUserIds = (userIds = []) => {
  if (!Array.isArray(userIds)) return [];
  return [...new Set(userIds.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0))];
};

const createNotifications = async ({
  userIds = [],
  adminId,
  title,
  message,
  type = 'info',
  relatedTable = null,
  relatedId = null,
}) => {
  const recipients = normalizeUserIds(userIds);
  const senderId = Number(adminId);

  if (!Number.isInteger(senderId) || senderId <= 0) {
    return { inserted: 0, skipped: recipients.length };
  }

  if (recipients.length === 0 || !title || !message) {
    return { inserted: 0, skipped: recipients.length };
  }

  const normalizedType = ALLOWED_TYPES.has(type) ? type : 'info';
  const notificationValues = recipients.map((userId) => [
    userId,
    senderId,
    String(title).trim(),
    String(message).trim(),
    normalizedType,
    relatedTable || null,
    relatedId || null,
  ]);

  await db.query(
    `INSERT INTO notifications
      (UserID, AdminID, Title, Message, Type, RelatedTable, RelatedID, CreatedAt)
     VALUES ?`,
    [notificationValues.map((entry) => [...entry, new Date()])]
  );

  return { inserted: recipients.length, skipped: 0 };
};

module.exports = {
  createNotifications,
};
