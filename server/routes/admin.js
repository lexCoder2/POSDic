const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { protect, checkPermission } = require("../middleware/auth");

// Reset database endpoint - Admin only
router.post("/reset-database", protect, async (req, res) => {
  try {
    // Check if user is admin
    const user = req.user;
    if (user.role !== "admin") {
      return res.status(403).json({
        message: "Only administrators can reset the database",
      });
    }

    // Get all collections
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();

    // Collections to preserve
    const preserveCollections = [
      "grocery_products",
      "categories",
      "users",
      "printtemplates",
      "providers",
    ];

    // Drop all collections except the ones to preserve
    for (const collection of collections) {
      if (!preserveCollections.includes(collection.name)) {
        try {
          await mongoose.connection.db.dropCollection(collection.name);
          console.log(`✓ Dropped collection: ${collection.name}`);
        } catch (err) {
          console.error(`Error dropping collection ${collection.name}:`, err);
        }
      }
    }

    console.log(`✓ Database reset completed by ${user.username}`);

    res.json({
      success: true,
      message:
        "Database reset successfully. Products, Users, Templates, and Providers have been preserved.",
    });
  } catch (error) {
    console.error("Error resetting database:", error);
    res.status(500).json({
      message: "Error resetting database",
      error: error.message,
    });
  }
});

module.exports = router;
