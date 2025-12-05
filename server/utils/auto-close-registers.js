const Register = require("../models/Register");
const Sale = require("../models/Sale");

/**
 * Auto-close registers that have been open for more than 16 hours
 * Sets closing cash to expected cash (opening + cash sales - withdrawals)
 * Marks them with isAutoClose flag
 */
async function autoCloseOldRegisters() {
  try {
    const sixteenHoursAgo = new Date(Date.now() - 16 * 60 * 60 * 1000);

    // Find all open registers older than 16 hours
    const oldRegisters = await Register.find({
      status: "open",
      openedAt: { $lt: sixteenHoursAgo },
    }).populate("openedBy");

    if (oldRegisters.length === 0) {
      return { closed: 0, message: "No registers to auto-close" };
    }

    console.log(
      `[Auto-Close] Found ${oldRegisters.length} register(s) open for more than 16 hours`
    );

    const closedRegisters = [];

    for (const register of oldRegisters) {
      try {
        // Calculate expected cash
        const sales = await Sale.find({
          cashier: register.openedBy._id,
          createdAt: { $gte: register.openedAt },
          status: { $ne: "cancelled" },
        });

        const totalCashSales = sales
          .filter((s) => s.paymentMethod === "cash")
          .reduce((sum, sale) => sum + sale.total, 0);

        const totalWithdrawals = register.withdrawals
          ? register.withdrawals.reduce((sum, w) => sum + w.amount, 0)
          : 0;

        const expectedCash =
          register.openingCash + totalCashSales - totalWithdrawals;

        // Auto-close the register with expected cash as closing cash
        register.status = "closed";
        register.closedAt = new Date();
        register.autoClosedAt = new Date();
        register.closedBy = register.openedBy._id; // System closes it under the user who opened it
        register.closingCash = expectedCash;
        register.expectedCash = expectedCash;
        register.cashDifference = 0; // No difference since we're using expected cash
        register.isAutoClose = true;
        register.notes = register.notes
          ? `${register.notes}\n[AUTO-CLOSED: Register was open for more than 16 hours]`
          : "[AUTO-CLOSED: Register was open for more than 16 hours]";

        await register.save();

        closedRegisters.push({
          registerNumber: register.registerNumber,
          openedBy: register.openedBy.username,
          openedAt: register.openedAt,
          closedAt: register.closedAt,
          expectedCash,
        });

        console.log(
          `[Auto-Close] Closed register ${register.registerNumber} for user ${register.openedBy.username}`
        );
      } catch (err) {
        console.error(
          `[Auto-Close] Error closing register ${register._id}:`,
          err
        );
      }
    }

    return {
      closed: closedRegisters.length,
      message: `Auto-closed ${closedRegisters.length} register(s)`,
      registers: closedRegisters,
    };
  } catch (error) {
    console.error("[Auto-Close] Error in autoCloseOldRegisters:", error);
    throw error;
  }
}

/**
 * Schedule auto-close to run periodically
 * Runs every hour by default
 */
function scheduleAutoClose(intervalMinutes = 60) {
  const intervalMs = intervalMinutes * 60 * 1000;

  console.log(
    `[Auto-Close] Scheduling auto-close to run every ${intervalMinutes} minutes`
  );

  // Run immediately on startup
  autoCloseOldRegisters()
    .then((result) => {
      console.log(`[Auto-Close] Initial check: ${result.message}`);
    })
    .catch((err) => {
      console.error("[Auto-Close] Initial check failed:", err);
    });

  // Then run periodically
  setInterval(() => {
    autoCloseOldRegisters()
      .then((result) => {
        if (result.closed > 0) {
          console.log(`[Auto-Close] Periodic check: ${result.message}`);
        }
      })
      .catch((err) => {
        console.error("[Auto-Close] Periodic check failed:", err);
      });
  }, intervalMs);
}

module.exports = {
  autoCloseOldRegisters,
  scheduleAutoClose,
};
