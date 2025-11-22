const mongoose = require("mongoose");

const printTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    description: String,
    templateType: {
      type: String,
      enum: ["receipt", "invoice", "label"],
      default: "receipt",
    },
    paperSize: {
      type: String,
      enum: ["80mm", "58mm", "A4", "custom"],
      default: "80mm",
    },
    customSize: {
      width: Number,
      height: Number,
    },
    header: {
      showLogo: Boolean,
      logoUrl: String,
      storeName: String,
      showStoreName: Boolean,
      storeNameSize: String,
      storeNameFont: String,
      storeNameBold: Boolean,
      storeAddress: String,
      showStoreAddress: Boolean,
      storeAddressSize: String,
      storeAddressFont: String,
      storeAddressBold: Boolean,
      storePhone: String,
      showStorePhone: Boolean,
      storePhoneSize: String,
      storePhoneFont: String,
      storePhoneBold: Boolean,
      storeEmail: String,
      showStoreEmail: Boolean,
      storeEmailSize: String,
      storeEmailFont: String,
      storeEmailBold: Boolean,
      taxId: String,
      customText: String,
    },
    body: {
      showProductCode: Boolean,
      showBarcode: Boolean,
      showQuantity: Boolean,
      showUnitPrice: Boolean,
      showDiscount: Boolean,
      showTax: Boolean,
      showSubtotal: Boolean,
      productSize: String,
      productFont: String,
      productBold: Boolean,
      fontSize: {
        type: String,
        enum: ["small", "medium", "large"],
        default: "medium",
      },
    },
    footer: {
      showTotals: Boolean,
      showPaymentMethod: Boolean,
      showCashier: Boolean,
      showDateTime: Boolean,
      showBarcode: Boolean,
      customMessage: String,
      showThankYou: Boolean,
      totalSize: String,
      totalFont: String,
      totalBold: Boolean,
      footerSize: String,
      footerFont: String,
      footerBold: Boolean,
    },
    styles: {
      fontFamily: String,
      primaryColor: String,
      textAlign: {
        type: String,
        enum: ["left", "center", "right"],
        default: "center",
      },
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("PrintTemplate", printTemplateSchema);
