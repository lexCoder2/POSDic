const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { generateToken } = require("../utils/jwt");

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public (should be protected in production)
router.post("/register", async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      firstName,
      lastName,
      role,
      permissions,
    } = req.body;

    // Check if user exists
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Create user
    user = new User({
      username,
      email,
      password,
      firstName,
      lastName,
      role: role || "cashier",
      permissions: permissions || ["sales"],
    });

    await user.save();

    const token = generateToken(user._id);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        permissions: user.permissions,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check for user
    const user = await User.findOne({ username }).select("+password");

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.active) {
      return res.status(401).json({ message: "Account is deactivated" });
    }

    // Validate password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Update last login
    user.lastLogin = Date.now();
    await user.save();

    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        permissions: user.permissions,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   POST /api/auth/qr-login
// @desc    Login user via QR code
// @access  Public
router.post("/qr-login", async (req, res) => {
  try {
    const { qrData } = req.body;

    if (!qrData) {
      return res.status(400).json({ message: "QR data is required" });
    }

    // Parse QR data - expected format: "POSDIC:userId" or just userId
    let userId = qrData;
    if (qrData.startsWith("POSDIC:")) {
      userId = qrData.substring(7);
    }

    // Validate userId format (MongoDB ObjectId)
    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(401).json({ message: "Invalid QR code format" });
    }

    // Find user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(401).json({ message: "Invalid QR code" });
    }

    if (!user.active) {
      return res.status(401).json({ message: "Account is deactivated" });
    }

    // Update last login
    user.lastLogin = Date.now();
    await user.save();

    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        permissions: user.permissions,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
