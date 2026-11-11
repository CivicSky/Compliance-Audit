const jwt = require('jsonwebtoken');
const { verifySession } = require('../utils/sessionStore');

/** Attaches req.user when a valid Bearer token is present; rejects if an active token's session was replaced. */
module.exports = async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  const token = authHeader.split(' ')[1];
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, 'MY_SECRET_KEY');
    if (decoded?.userid) {
      const sessionCheck = await verifySession(decoded.userid, decoded.sid);
      if (!sessionCheck.valid) {
        return res.status(401).json({
          success: false,
          code: sessionCheck.reason || 'SESSION_REPLACED',
          message:
            sessionCheck.reason === 'SESSION_REPLACED'
              ? 'Your session has ended because your account was signed in on another browser or device.'
              : 'Session expired or logged out. Please sign in again.',
        });
      }
    }
    req.user = decoded;
  } catch {
    // ignore invalid/expired token for optional auth
  }
  next();
};
