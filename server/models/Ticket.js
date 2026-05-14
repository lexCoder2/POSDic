const mongoose = require("mongoose");

const ticketItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true },
  subtotal: { type: Number, required: true },
});

const ticketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: Number,
      unique: true,
    },
    items: {
      type: [ticketItemSchema],
      required: true,
      validate: [(v) => v.length > 0, "Ticket must have at least one item"],
    },
    subtotal: { type: Number, required: true, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true, default: 0 },
    status: {
      type: String,
      enum: ["pending", "in_checkout", "completed", "cancelled"],
      default: "pending",
    },
    notes: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    cashier: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    completedAt: { type: Date },
    sale: { type: mongoose.Schema.Types.ObjectId, ref: "Sale" },
  },
  { timestamps: true }
);

// Auto-increment ticketNumber before saving
ticketSchema.pre("save", async function (next) {
  if (!this.ticketNumber) {
    const lastTicket = await this.constructor
      .findOne({}, "ticketNumber")
      .sort({ ticketNumber: -1 });
    this.ticketNumber = lastTicket ? lastTicket.ticketNumber + 1 : 1;
  }
  next();
});

module.exports = mongoose.model("Ticket", ticketSchema);
