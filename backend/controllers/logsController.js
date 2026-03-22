const db = require('../db');

async function recordLog(userId, action, details = null) {
  if (!userId || !action) return;
  try {
    await db.query(
      'INSERT INTO logs (UserID, Action, Details) VALUES (?, ?, ?)',
      [userId, String(action).slice(0, 100), details ? String(details).slice(0, 5000) : null]
    );
  } catch (err) {
    console.error('recordLog:', err.message);
  }
}

exports.recordLog = recordLog;

exports.getLogs = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 300, 1000);
    const [rows] = await db.query(
      `SELECT
        l.LogID,
        l.UserID,
        l.Action,
        l.Timestamp,
        l.Details,
        u.FirstName,
        u.MiddleInitial,
        u.LastName,
        u.RoleID,
        r.RoleName
      FROM logs l
      INNER JOIN users u ON l.UserID = u.UserID
      LEFT JOIN roles r ON u.RoleID = r.RoleID
      ORDER BY l.Timestamp DESC, l.LogID DESC
      LIMIT ?`,
      [limit]
    );

    const logs = rows.map((row) => {
      const mid = row.MiddleInitial ? ` ${row.MiddleInitial}.` : '';
      const displayName = `${row.FirstName || ''}${mid} ${row.LastName || ''}`.replace(/\s+/g, ' ').trim();
      const actorKind = row.RoleID === 1 ? 'Admin' : 'User';
      return {
        LogID: row.LogID,
        UserID: row.UserID,
        Action: row.Action,
        Timestamp: row.Timestamp,
        Details: row.Details,
        displayName: displayName || `User #${row.UserID}`,
        RoleName: row.RoleName || actorKind,
        actorKind,
      };
    });

    res.json({ success: true, logs });
  } catch (err) {
    console.error('getLogs:', err);
    res.status(500).json({ success: false, message: 'Failed to load activity logs' });
  }
};
