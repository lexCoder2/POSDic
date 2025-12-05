const express = require("express");
const router = express.Router();
const Provider = require("../models/Provider");
const { protect, checkPermission } = require("../middleware/auth");

// @route   GET /api/providers
// @desc    Get all providers
// @access  Private
router.get("/", protect, async (req, res) => {
  try {
    const { page, pageSize, search } = req.query;
    let query = {};

    // Search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
        { contactName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    // Get total count
    const total = await Provider.countDocuments(query);

    // Pagination
    const currentPage = parseInt(page) || 1;
    const limit = parseInt(pageSize) || 100;
    const skip = (currentPage - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    const providers = await Provider.find(query)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit);

    res.json({
      data: providers,
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

// @route   GET /api/providers/code/:code
// @desc    Get provider by code
// @access  Private
router.get("/code/:code", protect, async (req, res) => {
  try {
    const provider = await Provider.findOne({ code: req.params.code });

    if (!provider) {
      return res.status(404).json({ message: "Provider not found" });
    }

    res.json(provider);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   GET /api/providers/:id
// @desc    Get provider by ID
// @access  Private
router.get("/:id", protect, async (req, res) => {
  try {
    const provider = await Provider.findById(req.params.id);

    if (!provider) {
      return res.status(404).json({ message: "Provider not found" });
    }

    res.json(provider);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   POST /api/providers
// @desc    Create new provider
// @access  Private (requires inventory permission)
router.post("/", protect, checkPermission("inventory"), async (req, res) => {
  try {
    const provider = new Provider(req.body);
    await provider.save();
    res.status(201).json(provider);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Provider code already exists" });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   PUT /api/providers/:id
// @desc    Update provider
// @access  Private (requires inventory permission)
router.put("/:id", protect, checkPermission("inventory"), async (req, res) => {
  try {
    const provider = await Provider.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!provider) {
      return res.status(404).json({ message: "Provider not found" });
    }

    res.json(provider);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   DELETE /api/providers/:id
// @desc    Delete provider
// @access  Private (requires inventory permission)
router.delete(
  "/:id",
  protect,
  checkPermission("inventory"),
  async (req, res) => {
    try {
      const provider = await Provider.findByIdAndDelete(req.params.id);

      if (!provider) {
        return res.status(404).json({ message: "Provider not found" });
      }

      res.json({ message: "Provider deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

module.exports = router;
