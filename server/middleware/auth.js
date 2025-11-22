const User = require("../models/User");
const { verifyToken } = require("../utils/jwt");

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res
      .status(401)
      .json({ message: "Not authorized to access this route" });
  }

  try {
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ message: "Invalid token" });
    }

    req.user = await User.findById(decoded.id).select("-password");

    if (!req.user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!req.user.active) {
      return res.status(401).json({ message: "User account is deactivated" });
    }

    next();
  } catch (error) {
    return res
      .status(401)
      .json({ message: "Not authorized to access this route" });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `User role ${req.user.role} is not authorized to access this route`,
      });
    }
    next();
  };
};

const checkPermission = (permission) => {
  return (req, res, next) => {
    if (req.user.role === "admin") {
      return next();
    }

    if (!req.user.permissions.includes(permission)) {
      return res.status(403).json({
        message: `You don't have permission to ${permission}`,
      });
    }
    next();
  };
};

module.exports = { protect, authorize, checkPermission };
