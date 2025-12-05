const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "manager", "cashier", "employee"],
      default: "cashier",
    },
    phone: {
      type: String,
    },
    active: {
      type: Boolean,
      default: true,
    },
    permissions: [
      {
        type: String,
        enum: [
          "sales",
          "refunds",
          "discounts",
          "reports",
          "inventory",
          "users",
          "settings",
        ],
      },
    ],
    internalSalesLimit: {
      type: Number,
      default: 0,
    },
    lastLogin: {
      type: Date,
    },
    settings: {
      displayName: {
        type: String,
        default: "",
      },
      language: {
        type: String,
        default: "en",
      },
      printerMode: {
        type: String,
        enum: ["inherit", "plain", "styled"],
        default: "inherit",
      },
      currency: {
        type: String,
        default: "USD",
      },
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
