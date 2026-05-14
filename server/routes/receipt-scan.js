const express = require("express");
const router = express.Router();
const { protect, checkPermission } = require("../middleware/auth");
const { parseReceipt } = require("../services/receipt-parser");

// POST /api/receipt-scan/parse
router.post(
  "/parse",
  protect,
  checkPermission(["inventory"]),
  async (req, res) => {
    const { text } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ message: "Receipt text is required" });
    }

    try {
      const result = parseReceipt(text);
      return res.json(result);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }
);

module.exports = router;
