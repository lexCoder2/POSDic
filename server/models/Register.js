const mongoose = require("mongoose");

const registerSchema = new mongoose.Schema(
  {
    registerNumber: {
      type: String,
      required: true,
    },
    deviceId: {
      type: String,
      index: true,
    },
    deviceName: {
      type: String,
    },
    openedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    openedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    closedAt: {
      type: Date,
    },
    openingCash: {
      type: Number,
      required: true,
      default: 0,
    },
    closingCash: {
      type: Number,
    },
    expectedCash: {
      type: Number,
    },
    cashDifference: {
      type: Number,
    },
    totalSales: {
      type: Number,
      default: 0,
    },
    totalTransactions: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
    },
    notes: {
      type: String,
    },
    autoClosedAt: {
      type: Date,
    },
    isAutoClose: {
      type: Boolean,
      default: false,
    },
    withdrawals: [
      {
        amount: {
          type: Number,
          required: true,
        },
        reason: {
          type: String,
          required: true,
        },
        withdrawnBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        withdrawnAt: {
          type: Date,
          required: true,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index for finding active register
registerSchema.index({ status: 1, openedAt: -1 });
registerSchema.index({ openedBy: 1, openedAt: -1 });

module.exports = mongoose.model("Register", registerSchema);
