const express = require("express");
const router = express.Router();
const PrintTemplate = require("../models/PrintTemplate");
const { protect, checkPermission } = require("../middleware/auth");

// @route   GET /api/templates
// @desc    Get all print templates
// @access  Private
router.get("/", protect, async (req, res) => {
  try {
    const templates = await PrintTemplate.find().sort({
      isDefault: -1,
      name: 1,
    });
    res.json(templates);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   GET /api/templates/default
// @desc    Get default template
// @access  Private
router.get("/default", protect, async (req, res) => {
  try {
    let template = await PrintTemplate.findOne({
      isDefault: true,
      active: true,
    });

    if (!template) {
      template = await PrintTemplate.findOne({ active: true });
    }

    if (!template) {
      return res.status(404).json({ message: "No template found" });
    }

    res.json(template);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   GET /api/templates/:id
// @desc    Get template by ID
// @access  Private
router.get("/:id", protect, async (req, res) => {
  try {
    const template = await PrintTemplate.findById(req.params.id);

    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    res.json(template);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   POST /api/templates
// @desc    Create new template
// @access  Private (requires settings permission)
router.post("/", protect, checkPermission("settings"), async (req, res) => {
  try {
    // If this template is set as default, unset other defaults
    if (req.body.isDefault) {
      await PrintTemplate.updateMany({}, { isDefault: false });
    }

    const template = new PrintTemplate(req.body);
    await template.save();
    res.status(201).json(template);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Template name already exists" });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   PUT /api/templates/:id
// @desc    Update template
// @access  Private (requires settings permission)
router.put("/:id", protect, checkPermission("settings"), async (req, res) => {
  try {
    // If this template is set as default, unset other defaults
    if (req.body.isDefault) {
      await PrintTemplate.updateMany(
        { _id: { $ne: req.params.id } },
        { isDefault: false }
      );
    }

    const template = await PrintTemplate.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    res.json(template);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   DELETE /api/templates/:id
// @desc    Delete template
// @access  Private (requires settings permission)
router.delete(
  "/:id",
  protect,
  checkPermission("settings"),
  async (req, res) => {
    try {
      const template = await PrintTemplate.findByIdAndDelete(req.params.id);

      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      res.json({ message: "Template deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

module.exports = router;
