const express = require("express");
const router = express.Router();
const Sale = require("../models/Sale");
const Product = require("../models/Product");
const { protect, checkPermission, authorize } = require("../middleware/auth");

// @route   GET /api/sales
// @desc    Get all sales
// @access  Private
router.get("/", protect, async (req, res) => {
  try {
    const { status, startDate, endDate, cashier, page, pageSize, search } =
      req.query;
    let query = {};

    if (status) query.status = status;
    if (cashier) query.cashier = cashier;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Search functionality
    if (search) {
      query.$or = [
        { saleNumber: { $regex: search, $options: "i" } },
        { paymentMethod: { $regex: search, $options: "i" } },
      ];
    }

    // Get total count
    const total = await Sale.countDocuments(query);

    // Pagination
    const currentPage = parseInt(page) || 1;
    const limit = parseInt(pageSize) || 100;
    const skip = (currentPage - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    const sales = await Sale.find(query)
      .populate("cashier", "firstName lastName username")
      .populate("cancelledBy", "firstName lastName")
      .populate("items.product", "name code")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      data: sales,
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

// @route   GET /api/sales/:id
// @desc    Get sale by ID
// @access  Private
router.get("/:id", protect, async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate("cashier", "firstName lastName username email")
      .populate("cancelledBy", "firstName lastName username")
      .populate("items.product", "name code barcode")
      .populate("printTemplate", "name");

    if (!sale) {
      return res.status(404).json({ message: "Sale not found" });
    }

    res.json(sale);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   POST /api/sales
// @desc    Create new sale or save sale in progress
// @access  Private (requires sales permission)
router.post("/", protect, checkPermission("sales"), async (req, res) => {
  try {
    const saleData = {
      ...req.body,
      cashier: req.user._id,
    };

    const sale = new Sale(saleData);
    await sale.save();

    // Only update product stock if sale is completed and product exists
    if (sale.status === "completed") {
      for (const item of sale.items) {
        if (item.product) {
          await Product.findByIdAndUpdate(item.product, {
            $inc: { stock: -item.quantity },
          });
        }
      }
    }

    const populatedSale = await Sale.findById(sale._id)
      .populate("cashier", "firstName lastName username")
      .populate("items.product", "name code");

    res.status(201).json(populatedSale);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   PUT /api/sales/:id
// @desc    Update sale (status, items, etc.)
// @access  Private (requires sales permission)
router.put("/:id", protect, checkPermission("sales"), async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);

    if (!sale) {
      return res.status(404).json({ message: "Sale not found" });
    }

    // Check if cashier owns the sale or user is admin/manager
    if (
      sale.cashier.toString() !== req.user._id.toString() &&
      req.user.role !== "admin" &&
      req.user.role !== "manager"
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this sale" });
    }

    const previousStatus = sale.status;
    const updateData = { ...req.body };

    // Update sale
    Object.assign(sale, updateData);
    await sale.save();

    // Handle stock updates when status changes
    if (previousStatus === "in_progress" && sale.status === "completed") {
      // Deduct stock when completing sale
      for (const item of sale.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: -item.quantity },
        });
      }
    } else if (previousStatus === "completed" && sale.status === "cancelled") {
      // Restore stock when cancelling completed sale
      for (const item of sale.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity },
        });
      }
    }

    const populatedSale = await Sale.findById(sale._id)
      .populate("cashier", "firstName lastName username")
      .populate("items.product", "name code");

    res.json(populatedSale);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   PUT /api/sales/:id/cancel
// @desc    Cancel a sale
// @access  Private (requires refunds permission or admin/manager role)
router.put("/:id/cancel", protect, async (req, res) => {
  try {
    // Check permissions
    if (
      req.user.role !== "admin" &&
      req.user.role !== "manager" &&
      !req.user.permissions.includes("refunds")
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to cancel sales" });
    }

    const { cancellationReason } = req.body;

    const sale = await Sale.findById(req.params.id);

    if (!sale) {
      return res.status(404).json({ message: "Sale not found" });
    }

    if (sale.status === "cancelled") {
      return res.status(400).json({ message: "Sale is already cancelled" });
    }

    sale.status = "cancelled";
    sale.cancellationReason = cancellationReason;
    sale.cancelledBy = req.user._id;
    sale.cancelledAt = Date.now();

    await sale.save();

    // Restore product stock
    for (const item of sale.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity },
      });
    }

    const populatedSale = await Sale.findById(sale._id)
      .populate("cashier", "firstName lastName")
      .populate("cancelledBy", "firstName lastName");

    res.json(populatedSale);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   GET /api/sales/reports/summary
// @desc    Get sales summary
// @access  Private (requires reports permission)
router.get(
  "/reports/summary",
  protect,
  checkPermission("reports"),
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      let query = { status: "completed" };

      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      const sales = await Sale.find(query);

      const summary = {
        totalSales: sales.length,
        totalRevenue: sales.reduce((sum, sale) => sum + sale.total, 0),
        totalDiscount: sales.reduce((sum, sale) => sum + sale.discountTotal, 0),
        totalTax: sales.reduce((sum, sale) => sum + sale.taxTotal, 0),
        averageTicket:
          sales.length > 0
            ? sales.reduce((sum, sale) => sum + sale.total, 0) / sales.length
            : 0,
        paymentMethods: {
          cash: sales.filter((s) => s.paymentMethod === "cash").length,
          card: sales.filter((s) => s.paymentMethod === "card").length,
          transfer: sales.filter((s) => s.paymentMethod === "transfer").length,
          mixed: sales.filter((s) => s.paymentMethod === "mixed").length,
        },
      };

      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

module.exports = router;
