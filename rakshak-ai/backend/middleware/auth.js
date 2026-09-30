const { verifyToken } = require("../config/jwt");
const { User } = require("../models");

const protect = async (req, res, next) => {
  console.log("[AUTH MIDDLEWARE] Starting...");
  console.log("[AUTH MIDDLEWARE] Request URL:", req.url);
  try {
    const authHeader = req.headers.authorization;
    console.log("[AUTH MIDDLEWARE] Authorization Header:", authHeader);

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("[AUTH MIDDLEWARE] No token or invalid format");
      return res.status(401).json({ success: false, message: "Access denied. No token provided." });
    }

    const token = authHeader.split(" ")[1];
    console.log("[AUTH MIDDLEWARE] Extracted Token:", token ? `${token.substring(0, 20)}...` : "null");

    const decoded = verifyToken(token);
    console.log("[AUTH MIDDLEWARE] Decoded Token:", decoded);

    const user = await User.findById(decoded.id).select("-password");
    console.log("[AUTH MIDDLEWARE] User from DB:", user ? user.toObject() : "null");

    if (!user) {
      console.log("[AUTH MIDDLEWARE] User not found");
      return res.status(401).json({ success: false, message: "User no longer exists." });
    }
    if (!user.isActive) {
      console.log("[AUTH MIDDLEWARE] User inactive");
      return res.status(403).json({ success: false, message: "Account deactivated." });
    }

    req.user = user;
    console.log("[AUTH MIDDLEWARE] User attached to req.user");
    next();
  } catch (err) {
    console.error("[AUTH MIDDLEWARE] Error:", err.name, err.message);
    console.error("[AUTH MIDDLEWARE] Stack Trace:", err.stack);
    
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Token expired. Please log in again." });
    }
    return res.status(401).json({ success: false, message: "Invalid token." });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: `Role '${req.user.role}' is not authorized.` });
  }
  next();
};

module.exports = { protect, authorize };
