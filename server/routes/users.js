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

module.exports = router;
