const express = require("express");
const router = express.Router();
const Settings = require("../models/Settings");
const { protect, checkPermission } = require("../middleware/auth");

const SELL_MODES = new Set(["combined", "split"]);

function serializeSettings(settings) {
  return {
    estimatedCostEnabled: settings.estimatedCostEnabled,
    estimatedCostMarginPercent: settings.estimatedCostMarginPercent,
    sellMode: settings.sellMode,
  };
}

// @route   GET /api/settings
// @desc    Get global app settings
// @access  Private (any authenticated user)
router.get("/", protect, async (req, res) => {
  try {
    const settings = await Settings.getSingleton();
    res.json(serializeSettings(settings));
  } catch (err) {
    console.error("GET /api/settings error:", err);
    res.status(500).json({ message: "Error fetching settings" });
  }
});

// @route   PUT /api/settings
// @desc    Update global app settings
// @access  Private (settings permission required)
router.put("/", protect, checkPermission("settings"), async (req, res) => {
  try {
    const { estimatedCostEnabled, estimatedCostMarginPercent, sellMode } =
      req.body;

    if (
      estimatedCostMarginPercent !== undefined &&
      (typeof estimatedCostMarginPercent !== "number" ||
        estimatedCostMarginPercent < 0 ||
        estimatedCostMarginPercent > 100)
    ) {
      return res.status(400).json({
        message:
          "estimatedCostMarginPercent must be a number between 0 and 100",
      });
    }

    if (sellMode !== undefined && !SELL_MODES.has(sellMode)) {
      return res.status(400).json({
        message: "sellMode must be one of: combined, split",
      });
    }

    if (sellMode !== undefined && req.user.role !== "admin") {
      return res.status(403).json({
        message: "Only admins can update sellMode",
      });
    }

    const update = {};
    if (estimatedCostEnabled !== undefined)
      update.estimatedCostEnabled = estimatedCostEnabled;
    if (estimatedCostMarginPercent !== undefined)
      update.estimatedCostMarginPercent = estimatedCostMarginPercent;
    if (sellMode !== undefined) update.sellMode = sellMode;

    const settings = await Settings.findByIdAndUpdate(
      "global",
      { $set: update },
      { new: true, upsert: true, runValidators: true }
    );

    res.json(serializeSettings(settings));
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({ message: err.message });
    }
    console.error("PUT /api/settings error:", err);
    res.status(500).json({ message: "Error updating settings" });
  }
});

module.exports = router;
