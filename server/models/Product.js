const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    // Core identifiers
    sku: {
      type: String,
      index: true,
    },
    product_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    reference: {
      type: String,
      index: true,
    },

    // Barcodes
    ean: {
      type: String,
      index: true,
    },
    ean13: {
      type: String,
      index: true,
    },
    upc: {
      type: String,
      index: true,
    },
    multi_ean: {
      type: String,
    },

    // Product info
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    brand: {
      type: String,
    },
    category: {
      type: String,
    },

    // Pricing
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    list_price: {
      type: Number,
      min: 0,
    },
    currency: {
      type: String,
      default: "MXN",
    },

    // Inventory
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },
    available: {
      type: Boolean,
      default: true,
    },

    // Images and URLs
    image_url: {
      type: String,
    },
    local_image: {
      type: String,
    },
    product_url: {
      type: String,
    },

    // Store info
    store: {
      type: String,
    },
    scraped_at: {
      type: Date,
    },

    // POS specific fields (optional, for extended functionality)
    minStock: {
      type: Number,
      default: 0,
    },
    unit: {
      type: String,
      enum: ["unit", "kg", "g", "l", "ml", "box"],
      default: "unit",
    },
    requiresScale: {
      type: Boolean,
      default: false,
    },
    taxRate: {
      type: Number,
      default: 0,
    },
    cost: {
      type: Number,
      default: 0,
      min: 0,
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Provider",
    },
    active: {
      type: Boolean,
      default: true,
    },
    incompleteInfo: {
      type: Boolean,
      default: false,
      index: true,
    },
    barcode_standard: {
      type: String,
      enum: ["EAN13", "UPC", "CODE128", "CODE39", "QR", ""],
      default: "",
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "grocery_products",
  }
);

productSchema.index({ name: "text", description: "text", brand: "text" });

module.exports = mongoose.model("Product", productSchema);
