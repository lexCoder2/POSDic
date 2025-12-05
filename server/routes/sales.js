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

// @route   POST /api/sales/:id/refund
// @desc    Refund a sale (full or partial)
// @access  Private (requires refunds permission or admin/manager role)
router.post("/:id/refund", protect, async (req, res) => {
  try {
    // Check permissions
    if (
      req.user.role !== "admin" &&
      req.user.role !== "manager" &&
      !req.user.permissions.includes("refunds")
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to refund sales" });
    }

    const { items, reason, refundType } = req.body;

    const sale = await Sale.findById(req.params.id);

    if (!sale) {
      return res.status(404).json({ message: "Sale not found" });
    }

    if (sale.status === "cancelled" || sale.status === "refunded") {
      return res
        .status(400)
        .json({ message: "Sale is already cancelled or refunded" });
    }

    if (refundType === "full") {
      // Full refund - restore all stock
      sale.status = "refunded";
      sale.cancellationReason = reason || "Full refund";
      sale.cancelledBy = req.user._id;
      sale.cancelledAt = Date.now();

      // Restore product stock for all items
      for (const item of sale.items) {
        if (item.product) {
          await Product.findByIdAndUpdate(item.product, {
            $inc: { stock: item.quantity },
          });
        }
      }
    } else if (refundType === "partial") {
      // Partial refund - restore stock for selected items
      if (!items || items.length === 0) {
        return res
          .status(400)
          .json({ message: "Items to refund are required for partial refund" });
      }

      // Update items and restore stock
      for (const refundItem of items) {
        const saleItem = sale.items.find(
          (item) => item._id.toString() === refundItem.itemId
        );

        if (saleItem) {
          const refundQty = refundItem.quantity || saleItem.quantity;

          // Restore stock
          if (saleItem.product) {
            await Product.findByIdAndUpdate(saleItem.product, {
              $inc: { stock: refundQty },
            });
          }

          // Update or remove item from sale
          if (refundQty >= saleItem.quantity) {
            // Remove item completely
            sale.items = sale.items.filter(
              (item) => item._id.toString() !== refundItem.itemId
            );
          } else {
            // Reduce quantity
            saleItem.quantity -= refundQty;
            saleItem.total =
              saleItem.quantity * saleItem.unitPrice -
              (saleItem.discountAmount || 0);
            saleItem.subtotal = saleItem.quantity * saleItem.unitPrice;
          }
        }
      }

      // Recalculate totals
      sale.subtotal = sale.items.reduce((sum, item) => sum + item.subtotal, 0);
      sale.discountTotal = sale.items.reduce(
        (sum, item) => sum + (item.discountAmount || 0),
        0
      );
      sale.taxTotal = sale.items.reduce(
        (sum, item) => sum + (item.taxAmount || 0),
        0
      );
      sale.total = sale.subtotal - sale.discountTotal + sale.taxTotal;

      // Mark as refunded if no items left
      if (sale.items.length === 0) {
        sale.status = "refunded";
      }

      sale.cancellationReason = reason || "Partial refund";
      sale.cancelledBy = req.user._id;
      sale.cancelledAt = Date.now();
    } else {
      return res
        .status(400)
        .json({ message: "Invalid refund type. Use 'full' or 'partial'" });
    }

    await sale.save();

    const populatedSale = await Sale.findById(sale._id)
      .populate("cashier", "firstName lastName")
      .populate("cancelledBy", "firstName lastName")
      .populate("items.product", "name code");

    res.json(populatedSale);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   POST /api/sales/internal
// @desc    Create internal sale (store consumption)
// @access  Private (admin/manager only)
router.post("/internal", protect, async (req, res) => {
  try {
    // Check if user is admin or manager
    if (req.user.role !== "admin" && req.user.role !== "manager") {
      return res.status(403).json({
        message: "Only admins and managers can create internal sales",
      });
    }

    const { items, notes } = req.body;

    // Calculate totals based on actual price (not list price)
    let subtotal = 0;
    const processedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({
          message: `Product not found: ${item.product}`,
        });
      }

      const itemSubtotal = product.price * item.quantity;
      subtotal += itemSubtotal;

      processedItems.push({
        product: product._id,
        productName: product.name,
        productCode: product.ean || product.sku || product.product_id,
        quantity: item.quantity,
        unitPrice: product.price,
        discount: 0,
        discountAmount: 0,
        taxRate: 0,
        taxAmount: 0,
        subtotal: itemSubtotal,
        total: itemSubtotal,
        weight: item.weight || undefined,
      });
    }

    // Check manager limit if user is manager
    if (req.user.role === "manager" && req.user.internalSalesLimit > 0) {
      if (subtotal > req.user.internalSalesLimit) {
        return res.status(403).json({
          message: `Internal sale amount ($${subtotal.toFixed(
            2
          )}) exceeds your limit of $${req.user.internalSalesLimit.toFixed(2)}`,
        });
      }
    }

    // Create internal sale
    const sale = new Sale({
      items: processedItems,
      subtotal,
      discountTotal: 0,
      taxTotal: 0,
      total: subtotal,
      paymentMethod: "cash", // Internal sales don't require payment
      cashier: req.user._id,
      status: "completed",
      isInternal: true,
      approvedBy: req.user._id,
      notes: notes || "Internal consumption",
    });

    await sale.save();

    // Update product stock
    for (const item of processedItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity },
      });
    }

    const populatedSale = await Sale.findById(sale._id)
      .populate("cashier", "firstName lastName username")
      .populate("approvedBy", "firstName lastName username")
      .populate("items.product", "name code");

    res.status(201).json(populatedSale);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   GET /api/sales/internal/stats
// @desc    Get internal sales statistics
// @access  Private (admin/manager only)
router.get("/internal/stats", protect, async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "manager") {
      return res.status(403).json({
        message: "Only admins and managers can view internal sales stats",
      });
    }

    const { startDate, endDate } = req.query;
    let query = { isInternal: true, status: "completed" };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const internalSales = await Sale.find(query).populate(
      "approvedBy",
      "firstName lastName"
    );

    const totalAmount = internalSales.reduce(
      (sum, sale) => sum + sale.total,
      0
    );
    const totalCount = internalSales.length;

    // Group by user
    const byUser = {};
    internalSales.forEach((sale) => {
      const userId = sale.approvedBy?._id?.toString();
      const userName = sale.approvedBy
        ? `${sale.approvedBy.firstName} ${sale.approvedBy.lastName}`
        : "Unknown";

      if (!byUser[userId]) {
        byUser[userId] = {
          name: userName,
          count: 0,
          total: 0,
        };
      }
      byUser[userId].count += 1;
      byUser[userId].total += sale.total;
    });

    res.json({
      totalAmount,
      totalCount,
      byUser: Object.values(byUser),
      recentSales: internalSales.slice(0, 10),
    });
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
