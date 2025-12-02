const mongoose = require("mongoose");

const providerSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    contactName: {
      type: String,
    },
    email: {
      type: String,
    },
    phone: {
      type: String,
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    taxId: {
      type: String,
    },
    notes: {
      type: String,
    },
    active: {
      type: Boolean,
      default: true,
    },
    paymentTerms: {
      type: String,
      enum: ["immediate", "15days", "30days", "60days", "90days"],
      default: "30days",
    },
  },
  {
    timestamps: true,
  }
);

// Auto-increment provider code
providerSchema.pre("save", async function (next) {
  if (this.isNew && (!this.code || this.code === "")) {
    const lastProvider = await this.constructor
      .findOne()
      .sort({ createdAt: -1 });
    const lastNumber =
      lastProvider && lastProvider.code
        ? parseInt(lastProvider.code.split("-")[1], 16)
        : -1;
    this.code = `PROV-${(lastNumber + 1)
      .toString(16)
      .toUpperCase()
      .padStart(4, "0")}`;
  }
  next();
});

module.exports = mongoose.model("Provider", providerSchema);
