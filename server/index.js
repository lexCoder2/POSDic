require("dotenv").config();
const express = require("express");
const https = require("https");
const fs = require("fs");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const connectDB = require("./config/database");

// Initialize express
const app = express();

// Middleware - CORS configuration
// For development, allow all origins. For production, restrict as needed.
app.use(
  cors({
    origin: true, // Reflect request origin
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  if (req.method === "POST" || req.method === "PUT") {
    console.log("  Body:", JSON.stringify(req.body, null, 2));
  }
  next();
});

// Serve static files (images, assets)
app.use("/assets", express.static(path.join(__dirname, "../src/assets")));
app.use(
  "/product_images",
  express.static(path.join(__dirname, "product_images"))
);

// Routes
// QZ Tray signing endpoint
const crypto = require("crypto");
const privateKeyPath = path.join(__dirname, "private-key.pem");
let privateKey;
try {
  privateKey = fs.readFileSync(privateKeyPath, "utf8");
} catch (err) {
  console.error("Could not read private key for signing:", err);
}

app.post("/api/sign", (req, res) => {
  const { toSign } = req.body;
  if (!toSign) return res.status(400).send("Missing toSign");
  try {
    const sign = crypto.createSign("SHA1");
    sign.update(toSign);
    sign.end();
    const signature = sign.sign(privateKey, "base64");
    res.json({ signature });
  } catch (err) {
    console.error("Signing error:", err);
    res.status(500).send("Signing error");
  }
});
const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const categoryRoutes = require("./routes/categories");
const salesRoutes = require("./routes/sales");
const userRoutes = require("./routes/users");
const providerRoutes = require("./routes/providers");
const templateRoutes = require("./routes/templates");
const cartRoutes = require("./routes/carts");
const registerRoutes = require("./routes/registers");

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/users", userRoutes);
app.use("/api/providers", providerRoutes);
app.use("/api/templates", templateRoutes);
app.use("/api/carts", cartRoutes);
app.use("/api/registers", registerRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "POS API is running" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error caught by middleware:");
  console.error(err.stack);
  res
    .status(500)
    .json({ message: "Something went wrong!", error: err.message });
});

// Auto-close utility
const { scheduleAutoClose } = require("./utils/auto-close-registers");

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    await connectDB();

    // Start auto-close scheduler (runs every hour)
    scheduleAutoClose(60);

    const PORT = process.env.PORT || 3001;
    const HOST = "0.0.0.0"; // Listen on all network interfaces

    // Load SSL certificates
    const httpsOptions = {
      key: fs.readFileSync(path.join(__dirname, "certs", "localhost-key.pem")),
      cert: fs.readFileSync(
        path.join(__dirname, "certs", "localhost-cert.pem")
      ),
    };

    // Create HTTPS server
    https.createServer(httpsOptions, app).listen(PORT, HOST, () => {
      console.log(`HTTPS Server is running on port ${PORT}`);
      console.log(`Local: https://localhost:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
      console.log("Ready to accept requests!");
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
