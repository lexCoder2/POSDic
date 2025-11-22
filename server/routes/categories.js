const express = require("express");
const router = express.Router();
const Category = require("../models/Category");
const { protect, checkPermission } = require("../middleware/auth");

// @route   GET /api/categories
// @desc    Get all categories
// @access  Private
router.get("/", protect, async (req, res) => {
  try {
    const categories = await Category.find()
      .populate("parentCategory", "name")
      .sort({ order: 1, name: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   GET /api/categories/:id
// @desc    Get category by ID
// @access  Private
router.get("/:id", protect, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id).populate(
      "parentCategory",
      "name"
    );

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json(category);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   POST /api/categories
// @desc    Create new category
// @access  Private (requires inventory permission)
router.post("/", protect, checkPermission("inventory"), async (req, res) => {
  try {
    const category = new Category(req.body);
    await category.save();
    res.status(201).json(category);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Category name already exists" });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   PUT /api/categories/:id
// @desc    Update category
// @access  Private (requires inventory permission)
router.put("/:id", protect, checkPermission("inventory"), async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json(category);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   DELETE /api/categories/:id
// @desc    Delete category
// @access  Private (requires inventory permission)
router.delete(
  "/:id",
  protect,
  checkPermission("inventory"),
  async (req, res) => {
    try {
      const category = await Category.findByIdAndDelete(req.params.id);

      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }

      res.json({ message: "Category deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

module.exports = router;
