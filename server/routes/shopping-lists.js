const express = require("express");
const router = express.Router();
const ShoppingList = require("../models/ShoppingList");
const Sale = require("../models/Sale");
const { protect } = require("../middleware/auth");

// GET /api/shopping-lists/recommendations — must be before /:id routes
router.get("/recommendations", protect, async (req, res) => {
  try {
    const today = new Date();
    const weekday = today.getDay(); // 0=Sun … 6=Sat

    // Gather product counts from the same weekday in past sales
    const startOfWindow = new Date(today);
    startOfWindow.setDate(startOfWindow.getDate() - 84); // 12 weeks back

    const sales = await Sale.find({
      createdAt: { $gte: startOfWindow },
      status: "completed",
    }).select("items createdAt");

    const countByProduct = {};
    for (const sale of sales) {
      const saleDay = new Date(sale.createdAt).getDay();
      if (saleDay !== weekday) continue;
      for (const item of sale.items || []) {
        const key = item.productName || String(item.product);
        countByProduct[key] = (countByProduct[key] || 0) + (item.quantity || 1);
      }
    }

    const recommendations = Object.entries(countByProduct)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([productName, frequency]) => ({ productName, frequency }));

    res.json({ recommendations, weekday });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/shopping-lists
router.get("/", protect, async (req, res) => {
  try {
    const lists = await ShoppingList.find().sort({ createdAt: -1 });
    res.json({ lists });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/shopping-lists
router.post("/", protect, async (req, res) => {
  try {
    const { name, items, weekday } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }
    const list = await ShoppingList.create({
      name,
      items: items || [],
      weekday,
      createdBy: req.user._id,
    });
    res.status(201).json({ list });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/shopping-lists/:id
router.get("/:id", protect, async (req, res) => {
  try {
    const list = await ShoppingList.findById(req.params.id);
    if (!list) return res.status(404).json({ message: "List not found" });
    res.json({ list });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/shopping-lists/:id
router.put("/:id", protect, async (req, res) => {
  try {
    const { name, items, status, weekday } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (items !== undefined) update.items = items;
    if (status !== undefined) update.status = status;
    if (weekday !== undefined) update.weekday = weekday;

    const list = await ShoppingList.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true }
    );
    if (!list) return res.status(404).json({ message: "List not found" });
    res.json({ list });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/shopping-lists/:id
router.delete("/:id", protect, async (req, res) => {
  try {
    const list = await ShoppingList.findByIdAndDelete(req.params.id);
    if (!list) return res.status(404).json({ message: "List not found" });
    res.json({ message: "List deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/shopping-lists/:id/items/:itemIndex/toggle
router.put("/:id/items/:itemIndex/toggle", protect, async (req, res) => {
  try {
    const list = await ShoppingList.findById(req.params.id);
    if (!list) return res.status(404).json({ message: "List not found" });

    const idx = parseInt(req.params.itemIndex, 10);
    if (isNaN(idx) || idx < 0 || idx >= list.items.length) {
      return res.status(400).json({ message: "Invalid item index" });
    }

    list.items[idx].purchased = !list.items[idx].purchased;
    list.items[idx].purchasedAt = list.items[idx].purchased
      ? new Date()
      : undefined;
    await list.save();
    res.json({ list });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
