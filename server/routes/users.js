const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { protect, authorize } = require("../middleware/auth");

// @route   GET /api/users
// @desc    Get all users
// @access  Private (admin/manager)
router.get("/", protect, authorize("admin", "manager"), async (req, res) => {
  try {
    const { page, pageSize, search } = req.query;
    let query = {};

    // Search functionality
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: "i" } },
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    // Get total count
    const total = await User.countDocuments(query);

    // Pagination
    const currentPage = parseInt(page) || 1;
    const limit = parseInt(pageSize) || 100;
    const skip = (currentPage - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      data: users,
      pagination: {
        total,
        page: currentPage,
        pageSize: limit,
        totalPages,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private (admin/manager)
router.get("/:id", protect, authorize("admin", "manager"), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private (admin/manager)
router.put("/:id", protect, authorize("admin", "manager"), async (req, res) => {
  try {
    const { password, ...updateData } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update fields
    Object.assign(user, updateData);

    // Update password if provided
    if (password) {
      user.password = password;
    }

    await user.save();

    const updatedUser = await User.findById(user._id).select("-password");
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Private (admin only)
router.delete("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   GET /api/users/me/profile
// @desc    Get current user profile
// @access  Private
router.get("/me/profile", protect, async (req, res) => {
  try {
    res.json(req.user);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   PUT /api/users/me/settings
// @desc    Update current user settings
// @access  Private
router.put("/me/settings", protect, async (req, res) => {
  try {
    const { displayName, language, printerMode, currency } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update settings
    if (!user.settings) {
      user.settings = {};
    }

    if (displayName !== undefined) user.settings.displayName = displayName;
    if (language !== undefined) user.settings.language = language;
    if (printerMode !== undefined) user.settings.printerMode = printerMode;
    if (currency !== undefined) user.settings.currency = currency;

    await user.save();

    const updatedUser = await User.findById(user._id).select("-password");
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   GET /api/users/me/settings
// @desc    Get current user settings
// @access  Private
router.get("/me/settings", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("settings");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user.settings || {});
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   GET /api/users/me/quick-access
// @desc    Get current user's quick access products
// @access  Private
router.get("/me/quick-access", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("quickAccess")
      .populate("quickAccess");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user.quickAccess || []);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   POST /api/users/me/quick-access/:productId
// @desc    Add product to quick access
// @access  Private
router.post("/me/quick-access/:productId", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Initialize quickAccess array if it doesn't exist
    if (!user.quickAccess) {
      user.quickAccess = [];
    }

    // Check if product is already in quick access
    if (user.quickAccess.includes(req.params.productId)) {
      return res
        .status(400)
        .json({ message: "Product already in quick access" });
    }

    // Add product to quick access
    user.quickAccess.push(req.params.productId);
    await user.save();

    const updatedUser = await User.findById(user._id)
      .select("quickAccess")
      .populate("quickAccess");

    res.json(updatedUser.quickAccess);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   DELETE /api/users/me/quick-access/:productId
// @desc    Remove product from quick access
// @access  Private
router.delete("/me/quick-access/:productId", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.quickAccess) {
      return res.status(400).json({ message: "No quick access products" });
    }

    // Remove product from quick access
    user.quickAccess = user.quickAccess.filter(
      (id) => id.toString() !== req.params.productId
    );
    await user.save();

    const updatedUser = await User.findById(user._id)
      .select("quickAccess")
      .populate("quickAccess");

    res.json(updatedUser.quickAccess);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
