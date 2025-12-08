const jwt = require("jsonwebtoken");

// Middleware to protect routes and get logged-in user
module.exports = function (req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ success: false, message: "No token provided" });
  }

  // Bearer <token>
  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ success: false, message: "No token provided" });
  }

  try {
    // 🔑 Verify token
    const decoded = jwt.verify(token, "MY_SECRET_KEY"); // replace with process.env.JWT_SECRET in production
    req.user = decoded; // Now req.user.userId is available
    next();
  } catch (error) {
    return res.status(403).json({ success: false, message: "Invalid token" });
  }
};
