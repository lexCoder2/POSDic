const mongoose = require("mongoose");

const shoppingItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true, default: 1 },
    purchased: { type: Boolean, default: false },
    purchasedAt: { type: Date },
  },
  { _id: false }
);

const shoppingListSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    items: [shoppingItemSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    weekday: { type: Number, min: 0, max: 6 }, // 0=Sunday … 6=Saturday
    status: {
      type: String,
      enum: ["active", "completed", "archived"],
      default: "active",
    },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ShoppingList", shoppingListSchema);
