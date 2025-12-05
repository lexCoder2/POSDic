const express = require("express");
const router = express.Router();
const Register = require("../models/Register");
const Sale = require("../models/Sale");
const { protect } = require("../middleware/auth");

// Get active register for current user
router.get("/active", protect, async (req, res) => {
  try {
    const register = await Register.findOne({
      openedBy: req.user.id,
      status: "open",
    })
      .populate("openedBy", "firstName lastName username")
      .populate("closedBy", "firstName lastName username");

    res.json(register);
  } catch (error) {
    console.error("Error fetching active register:", error);
    res.status(500).json({ message: "Error fetching active register" });
  }
});

// Get expected cash for active register
router.get("/active/expected-cash", protect, async (req, res) => {
  try {
    const register = await Register.findOne({
      openedBy: req.user.id,
      status: "open",
    });

    if (!register) {
      return res.status(404).json({ message: "No active register found" });
    }

    // Calculate total cash sales for this register session
    const sales = await Sale.find({
      cashier: register.openedBy,
      createdAt: { $gte: register.openedAt },
      status: { $ne: "cancelled" },
    });

    const totalCashSales = sales
      .filter((s) => s.paymentMethod === "cash")
      .reduce((sum, sale) => sum + sale.total, 0);

    // Calculate total withdrawals
    const totalWithdrawals = register.withdrawals
      ? register.withdrawals.reduce((sum, w) => sum + w.amount, 0)
      : 0;

    const expectedCash =
      register.openingCash + totalCashSales - totalWithdrawals;
    const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);

    res.json({
      openingCash: register.openingCash,
      totalCashSales,
      totalWithdrawals,
      expectedCash,
      totalSales,
      totalTransactions: sales.length,
    });
  } catch (error) {
    console.error("Error calculating expected cash:", error);
    res.status(500).json({ message: "Error calculating expected cash" });
  }
});

// Open a new register
router.post("/open", protect, async (req, res) => {
  try {
    const { openingCash, registerNumber } = req.body;

    // Check if user already has an open register
    const existingRegister = await Register.findOne({
      openedBy: req.user.id,
      status: "open",
    });

    if (existingRegister) {
      return res.status(400).json({
        message: "You already have an open register. Please close it first.",
      });
    }

    const register = new Register({
      registerNumber: registerNumber || `REG-${Date.now()}`,
      openedBy: req.user.id,
      openingCash: openingCash || 0,
      status: "open",
    });

    await register.save();
    await register.populate("openedBy", "firstName lastName username");

    res.status(201).json(register);
  } catch (error) {
    console.error("Error opening register:", error);
    res.status(500).json({ message: "Error opening register" });
  }
});

// Close a register
router.post("/:id/close", protect, async (req, res) => {
  try {
    // Only managers and admins can close registers
    if (req.user.role !== "admin" && req.user.role !== "manager") {
      return res.status(403).json({
        message: "Only managers and admins can close the register",
      });
    }

    const { closingCash, notes } = req.body;
    const register = await Register.findById(req.params.id);

    if (!register) {
      return res.status(404).json({ message: "Register not found" });
    }

    if (register.status === "closed") {
      return res.status(400).json({ message: "Register is already closed" });
    }

    // Calculate total sales for this register session
    const sales = await Sale.find({
      cashier: register.openedBy,
      createdAt: { $gte: register.openedAt },
    });

    const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
    const totalCashSales = sales
      .filter((s) => s.paymentMethod === "cash")
      .reduce((sum, sale) => sum + sale.total, 0);

    const expectedCash = register.openingCash + totalCashSales;
    const cashDifference = closingCash - expectedCash;

    register.closedBy = req.user.id;
    register.closedAt = new Date();
    register.closingCash = closingCash;
    register.expectedCash = expectedCash;
    register.cashDifference = cashDifference;
    register.totalSales = totalSales;
    register.totalTransactions = sales.length;
    register.status = "closed";
    register.notes = notes;

    await register.save();
    await register.populate("openedBy", "firstName lastName username");
    await register.populate("closedBy", "firstName lastName username");

    res.json(register);
  } catch (error) {
    console.error("Error closing register:", error);
    res.status(500).json({ message: "Error closing register" });
  }
});

// Get register history
router.get("/history", protect, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = {};

    if (startDate || endDate) {
      query.openedAt = {};
      if (startDate) query.openedAt.$gte = new Date(startDate);
      if (endDate) query.openedAt.$lte = new Date(endDate);
    }

    // Admin/Manager can see all, others see only their own
    if (req.user.role !== "admin" && req.user.role !== "manager") {
      query.openedBy = req.user.id;
    }

    const registers = await Register.find(query)
      .populate("openedBy", "firstName lastName username")
      .populate("closedBy", "firstName lastName username")
      .sort({ openedAt: -1 })
      .limit(100);

    res.json(registers);
  } catch (error) {
    console.error("Error fetching register history:", error);
    res.status(500).json({ message: "Error fetching register history" });
  }
});

// Get register by ID
router.get("/:id", protect, async (req, res) => {
  try {
    const register = await Register.findById(req.params.id)
      .populate("openedBy", "firstName lastName username")
      .populate("closedBy", "firstName lastName username");

    if (!register) {
      return res.status(404).json({ message: "Register not found" });
    }

    res.json(register);
  } catch (error) {
    console.error("Error fetching register:", error);
    res.status(500).json({ message: "Error fetching register" });
  }
});

// Record cash withdrawal (admin only)
router.post("/:id/withdraw", protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can withdraw cash" });
    }

    const { amount, reason } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid withdrawal amount" });
    }

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ message: "Withdrawal reason is required" });
    }

    const register = await Register.findById(req.params.id);

    if (!register) {
      return res.status(404).json({ message: "Register not found" });
    }

    if (register.status !== "open") {
      return res.status(400).json({ message: "Register is not open" });
    }

    // Record the withdrawal
    const withdrawal = {
      amount: parseFloat(amount),
      reason: reason.trim(),
      withdrawnBy: req.user.id,
      withdrawnAt: new Date(),
    };

    if (!register.withdrawals) {
      register.withdrawals = [];
    }
    register.withdrawals.push(withdrawal);

    await register.save();

    res.json({
      message: "Cash withdrawal recorded successfully",
      withdrawal,
    });
  } catch (error) {
    console.error("Error recording withdrawal:", error);
    res.status(500).json({ message: "Error recording withdrawal" });
  }
});

// Delete a register (admin only)
router.delete("/:id", protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Only admins can delete registers" });
    }

    const register = await Register.findById(req.params.id);

    if (!register) {
      return res.status(404).json({ message: "Register not found" });
    }

    // Prevent deletion of open registers
    if (register.status === "open") {
      return res.status(400).json({
        message: "Cannot delete an open register. Please close it first.",
      });
    }

    await Register.findByIdAndDelete(req.params.id);

    res.json({ message: "Register deleted successfully" });
  } catch (error) {
    console.error("Error deleting register:", error);
    res.status(500).json({ message: "Error deleting register" });
  }
});

module.exports = router;
