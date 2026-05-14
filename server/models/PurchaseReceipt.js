const mongoose = require("mongoose");

const parsedItemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    noIdentificacion: String, // CFDI field / barcode from invoice
    barcode: String, // resolved barcode for product matching
    quantity: { type: Number, default: 1 },
    unitCost: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    matchedProduct: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },
    createNew: { type: Boolean, default: false },
    included: { type: Boolean, default: true },
  },
  { _id: false }
);

const purchaseReceiptSchema = new mongoose.Schema(
  {
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Provider",
      required: true,
    },
    originalFilename: { type: String, required: true },
    fileType: {
      type: String,
      enum: ["image", "pdf", "excel", "xml", "camera"],
      required: true,
    },
    storagePath: String, // relative path under server/receipts/
    // Invoice metadata from parsed document
    invoiceNumber: String,
    invoiceDate: String,
    providerRfc: String, // From CFDI Emisor RFC
    providerName: String, // From CFDI Emisor Nombre
    parsedItems: [parsedItemSchema],
    totals: {
      subtotal: { type: Number, default: 0 },
      tax: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    status: {
      type: String,
      enum: ["pending", "reviewed", "applied"],
      default: "pending",
    },
    appliedAt: Date,
    appliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    notes: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("PurchaseReceipt", purchaseReceiptSchema);
