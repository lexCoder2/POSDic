const express = require("express");
const router = express.Router();
const Cart = require("../models/Cart");
const { protect, checkPermission } = require("../middleware/auth");

// @route   GET /api/carts
// @desc    Get all carts (with filters)
// @access  Private
router.get("/", protect, async (req, res) => {
  try {
    const { cashier, status, startDate, endDate } = req.query;
    let query = {};

    if (cashier) query.cashier = cashier;
    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const carts = await Cart.find(query)
      .populate("cashier", "firstName lastName username")
      .populate("items.product", "name code price")
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(carts);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   GET /api/carts/active/:cashierId
// @desc    Get active cart for a cashier
// @access  Private
router.get("/active/:cashierId", protect, async (req, res) => {
  try {
    const cart = await Cart.findOne({
      cashier: req.params.cashierId,
      status: "active",
    })
      .populate("cashier", "firstName lastName username")
      .populate("items.product", "name code price");

    if (!cart) {
      return res.status(404).json({ message: "No active cart found" });
    }

    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   GET /api/carts/:id
// @desc    Get cart by ID
// @access  Private
router.get("/:id", protect, async (req, res) => {
  try {
    const cart = await Cart.findById(req.params.id)
      .populate("cashier", "firstName lastName username email")
      .populate("items.product", "name code barcode price");

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   POST /api/carts
// @desc    Create new cart
// @access  Private (requires sales permission)
router.post("/", protect, checkPermission("sales"), async (req, res) => {
  try {
    const cart = new Cart(req.body);
    await cart.save();

    const populatedCart = await Cart.findById(cart._id)
      .populate("cashier", "firstName lastName username")
      .populate("items.product", "name code price");

    res.status(201).json(populatedCart);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   PUT /api/carts/:id
// @desc    Update cart
// @access  Private (requires sales permission)
router.put("/:id", protect, checkPermission("sales"), async (req, res) => {
  try {
    const cart = await Cart.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate("cashier", "firstName lastName username")
      .populate("items.product", "name code price");

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   PUT /api/carts/:id/abandon
// @desc    Mark cart as abandoned (public endpoint for sendBeacon)
// @access  Public (called on page unload)
router.put("/:id/abandon", async (req, res) => {
  try {
    const cart = await Cart.findByIdAndUpdate(
      req.params.id,
      { status: "abandoned" },
      { new: true }
    )
      .populate("cashier", "firstName lastName username")
      .populate("items.product", "name code price");

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   PUT /api/carts/:id/complete
// @desc    Mark cart as completed
// @access  Private (requires sales permission)
router.put(
  "/:id/complete",
  protect,
  checkPermission("sales"),
  async (req, res) => {
    try {
      const cart = await Cart.findByIdAndUpdate(
        req.params.id,
        { status: "completed" },
        { new: true }
      )
        .populate("cashier", "firstName lastName username")
        .populate("items.product", "name code price");

      if (!cart) {
        return res.status(404).json({ message: "Cart not found" });
      }

      res.json(cart);
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// @route   DELETE /api/carts/:id
// @desc    Delete cart
// @access  Private (requires sales permission)
router.delete("/:id", protect, checkPermission("sales"), async (req, res) => {
  try {
    const cart = await Cart.findByIdAndDelete(req.params.id);

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    res.json({ message: "Cart deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
