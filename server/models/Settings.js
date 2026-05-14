const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    _id: { type: String, default: "global" },
    estimatedCostEnabled: { type: Boolean, default: false },
    estimatedCostMarginPercent: {
      type: Number,
      default: 30,
      min: [0, "Margin percent must be between 0 and 100"],
      max: [100, "Margin percent must be between 0 and 100"],
    },
    sellMode: {
      type: String,
      enum: ["combined", "split"],
      default: "combined",
    },
  },
  { timestamps: true }
);

/**
 * Returns the singleton settings document, creating it with defaults if absent.
 */
settingsSchema.statics.getSingleton = async function () {
  let doc = await this.findById("global");
  if (!doc) {
    doc = await this.create({ _id: "global" });
  }
  return doc;
};

/**
 * Computes the estimated unit cost for a given unit price using the global margin.
 * @param {number} unitPrice
 * @param {number} marginPercent  0–100
 * @returns {number}
 */
settingsSchema.statics.estimatedCost = function (unitPrice, marginPercent) {
  return unitPrice * (1 - marginPercent / 100);
};

module.exports = mongoose.model("Settings", settingsSchema);
