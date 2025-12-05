const mongoose = require("mongoose");

const saleItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: false,
  },
  productName: String,
  productCode: String,
  quantity: {
    type: Number,
    required: true,
    min: 0,
  },
  unitPrice: {
    type: Number,
    required: true,
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  discountAmount: {
    type: Number,
    default: 0,
  },
  taxRate: {
    type: Number,
    default: 0,
  },
  taxAmount: {
    type: Number,
    default: 0,
  },
  subtotal: {
    type: Number,
    required: true,
  },
  total: {
    type: Number,
    required: true,
  },
  // Loose product fields
  weight: {
    type: Number,
    required: false,
    min: 0,
  },
  pricePerKg: {
    type: Number,
    required: false,
    min: 0,
  },
});

const saleSchema = new mongoose.Schema(
  {
    saleNumber: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
    },
    items: [saleItemSchema],
    subtotal: {
      type: Number,
      required: true,
    },
    discountTotal: {
      type: Number,
      default: 0,
    },
    taxTotal: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "transfer", "mixed"],
      required: true,
    },
    paymentDetails: {
      cash: Number,
      card: Number,
      transfer: Number,
      change: Number,
    },
    cashier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    customer: {
      name: String,
      email: String,
      phone: String,
      taxId: String,
    },
    status: {
      type: String,
      enum: ["in_progress", "completed", "cancelled", "refunded"],
      default: "in_progress",
    },
    cancellationReason: String,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    cancelledAt: Date,
    notes: String,
    printTemplate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PrintTemplate",
    },
    isInternal: {
      type: Boolean,
      default: false,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Auto-increment sale number
saleSchema.pre("save", async function (next) {
  if (this.isNew && !this.saleNumber) {
    const lastSale = await this.constructor
      .findOne({ saleNumber: { $exists: true, $ne: null } })
      .sort({ createdAt: -1 });

    let lastNumber;
    if (lastSale && lastSale.saleNumber) {
      const parts = lastSale.saleNumber.split("-");
      if (parts.length === 2) {
        lastNumber = parseInt(parts[1], 16);
      } else {
        lastNumber = 0xa0000000 - 1;
      }
    } else {
      lastNumber = 0xa0000000 - 1;
    }

    this.saleNumber = `SALE-${(lastNumber + 1)
      .toString(16)
      .toUpperCase()
      .padStart(8, "0")}`;
  }
  next();
});

module.exports = mongoose.model("Sale", saleSchema);
