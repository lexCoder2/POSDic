const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const Ticket = require("../models/Ticket");
const Sale = require("../models/Sale");

// GET /api/tickets — list tickets (optionally filter by status)
router.get("/", protect, async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }
    const tickets = await Ticket.find(filter)
      .populate("createdBy", "username fullName")
      .populate("cashier", "username fullName")
      .sort({ createdAt: -1 });
    res.json({ tickets });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/tickets — create/dispatch a ticket
router.post("/", protect, async (req, res) => {
  try {
    const { items, subtotal, discount, total, notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ message: "Ticket must have at least one item" });
    }

    const ticket = await Ticket.create({
      items,
      subtotal: subtotal || 0,
      discount: discount || 0,
      total: total || subtotal || 0,
      notes: notes || "",
      createdBy: req.user.id,
      status: "pending",
    });

    const populated = await Ticket.findById(ticket._id).populate(
      "createdBy",
      "username fullName"
    );
    res.status(201).json({ ticket: populated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/tickets/:id — get single ticket
router.get("/:id", protect, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate("createdBy", "username fullName")
      .populate("cashier", "username fullName");
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }
    res.json({ ticket });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/tickets/:id/claim — checkout machine claims the ticket
router.put("/:id/claim", protect, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }
    if (ticket.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Ticket is not available to claim" });
    }
    ticket.status = "in_checkout";
    await ticket.save();
    const populated = await Ticket.findById(ticket._id).populate(
      "createdBy",
      "username fullName"
    );
    res.json({ ticket: populated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/tickets/:id/complete — checkout completes payment and creates a Sale
router.put("/:id/complete", protect, async (req, res) => {
  try {
    const { paymentMethod, amountTendered } = req.body;

    if (!paymentMethod) {
      return res.status(400).json({ message: "paymentMethod is required" });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }
    if (ticket.status === "completed") {
      return res.status(400).json({ message: "Ticket is already completed" });
    }
    if (ticket.status === "cancelled") {
      return res
        .status(400)
        .json({ message: "Cannot complete a cancelled ticket" });
    }

    // Create a Sale from ticket items
    const saleItems = ticket.items.map((item) => ({
      product: item.product,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
      total: item.subtotal,
    }));

    // Get next sale number
    const lastSale = await Sale.findOne({}, "saleNumber").sort({
      saleNumber: -1,
    });
    const saleNumber = lastSale ? lastSale.saleNumber + 1 : 1;

    const sale = await Sale.create({
      saleNumber,
      items: saleItems,
      subtotal: ticket.subtotal,
      discount: ticket.discount || 0,
      tax: 0,
      total: ticket.total,
      paymentMethod,
      amountTendered: amountTendered || ticket.total,
      change: amountTendered ? Math.max(0, amountTendered - ticket.total) : 0,
      cashier: req.user.id,
      status: "completed",
    });

    ticket.status = "completed";
    ticket.cashier = req.user.id;
    ticket.completedAt = new Date();
    ticket.sale = sale._id;
    await ticket.save();

    const populated = await Ticket.findById(ticket._id).populate(
      "createdBy cashier",
      "username fullName"
    );
    res.json({ ticket: populated, sale });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/tickets/:id/cancel — cancel a ticket
router.put("/:id/cancel", protect, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }
    if (ticket.status === "completed") {
      return res
        .status(400)
        .json({ message: "Cannot cancel a completed ticket" });
    }
    if (ticket.status === "cancelled") {
      return res.status(400).json({ message: "Ticket is already cancelled" });
    }
    ticket.status = "cancelled";
    await ticket.save();
    const populated = await Ticket.findById(ticket._id).populate(
      "createdBy",
      "username fullName"
    );
    res.json({ ticket: populated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
