require("dotenv").config();
const express = require("express");
const https = require("https");
const fs = require("fs");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/database");

// Initialize express
const app = express();

// CORS Configuration
// In development: Allow all origins for local testing
// In production: nginx handles CORS (no CORS middleware needed here)
if (process.env.NODE_ENV !== "production") {
  app.use(
    cors({
      origin: true, // Allow all origins in development
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    })
  );
  console.log("CORS enabled for development mode");
}

// Body parser with error handling
app.use(
  bodyParser.json({
    limit: "10mb",
    verify: (req, res, buf, encoding) => {
      try {
        JSON.parse(buf);
      } catch (e) {
        throw new Error("Invalid JSON");
      }
    },
  })
);
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));

// Body parser error handler
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    console.error("Bad JSON:", err.message);
    return res.status(400).json({ error: "Invalid JSON format" });
  }
  next(err);
});

// Request timeout middleware (30 seconds)
app.use((req, res, next) => {
  req.setTimeout(30000);
  res.setTimeout(30000);
  next();
});

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
let privateKey = null;
try {
  privateKey = fs.readFileSync(privateKeyPath, "utf8");
  console.log("QZ Tray private key loaded successfully");
} catch (err) {
  console.error("Could not read private key for signing:", err.message);
  console.error(
    "QZ Tray signing will not work. Make sure private-key.pem exists in server directory."
  );
}

app.post("/api/sign", (req, res) => {
  const { toSign } = req.body;

  if (!privateKey) {
    console.error("❌ Signing failed: Private key not loaded");
    return res.status(500).json({
      error: "Signing not available",
      message: "Private key not configured on server",
    });
  }

  if (!toSign) {
    console.error("❌ Signing failed: Missing toSign parameter");
    return res.status(400).json({ error: "Missing toSign parameter" });
  }

  try {
    // Sign the data with SHA512 algorithm
    const sign = crypto.createSign("SHA512");
    sign.update(toSign);
    sign.end();
    const signature = sign.sign(privateKey, "base64");

    console.log(
      `✓ QZ Tray data signed successfully (${toSign.length} bytes → ${signature.length} chars)`
    );
    res.json({ signature });
  } catch (err) {
    console.error("❌ Signing error:", err.message);
    res.status(500).json({
      error: "Signing failed",
      message: err.message,
    });
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
const adminRoutes = require("./routes/admin");
const reportRoutes = require("./routes/reports");

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/users", userRoutes);
app.use("/api/providers", providerRoutes);
app.use("/api/templates", templateRoutes);
app.use("/api/carts", cartRoutes);
app.use("/api/registers", registerRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/reports", reportRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "POS API is running" });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  // Log error details
  console.error("\n=== ERROR CAUGHT ===");
  console.error(`Time: ${new Date().toISOString()}`);
  console.error(`Path: ${req.method} ${req.path}`);
  console.error(`Message: ${err.message}`);
  console.error(`Stack: ${err.stack}`);
  console.error("==================\n");

  // Determine error status code
  const statusCode = err.statusCode || err.status || 500;

  // Don't leak error details in production
  const errorResponse = {
    error: err.name || "ServerError",
    message: err.message || "Something went wrong",
  };

  // Include stack trace in development
  if (process.env.NODE_ENV !== "production") {
    errorResponse.stack = err.stack;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
});

// Auto-close utility
const { scheduleAutoClose } = require("./utils/auto-close-registers");

// Track server instance for graceful shutdown
let serverInstance = null;

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  if (serverInstance) {
    serverInstance.close(() => {
      console.log("HTTP/HTTPS server closed");

      // Close database connection
      const mongoose = require("mongoose");
      mongoose.connection.close(false, () => {
        console.log("MongoDB connection closed");
        console.log("Graceful shutdown complete");
        process.exit(0);
      });
    });

    // Force close after 10 seconds
    setTimeout(() => {
      console.error("Forcing shutdown after timeout");
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

// Handle shutdown signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("\n=== UNCAUGHT EXCEPTION ===");
  console.error(`Time: ${new Date().toISOString()}`);
  console.error(`Error: ${err.message}`);
  console.error(`Stack: ${err.stack}`);
  console.error("========================\n");

  // Log to file or external service in production
  if (process.env.NODE_ENV === "production") {
    // TODO: Send to logging service (Sentry, LogRocket, etc.)
  }

  // Keep server running for non-critical errors
  console.log("Server continues running...\n");
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("\n=== UNHANDLED REJECTION ===");
  console.error(`Time: ${new Date().toISOString()}`);
  console.error(`Reason: ${reason}`);
  console.error(`Promise:`, promise);
  console.error("=========================\n");

  // Log to file or external service in production
  if (process.env.NODE_ENV === "production") {
    // TODO: Send to logging service
  }

  // Keep server running
  console.log("Server continues running...\n");
});

// Handle warnings
process.on("warning", (warning) => {
  console.warn("\n=== WARNING ===");
  console.warn(warning.name);
  console.warn(warning.message);
  console.warn(warning.stack);
  console.warn("==============\n");
});

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    await connectDB();

    // Start auto-close scheduler (runs every hour)
    scheduleAutoClose(60);

    const PORT = process.env.PORT || 3001;
    const HOST = "0.0.0.0"; // Listen on all network interfaces

    // In production, run HTTP (nginx handles SSL termination)
    // In development, run HTTPS with local certificates
    if (process.env.NODE_ENV === "production") {
      const http = require("http");
      const networkInterfaces = require("os").networkInterfaces();
      const localIP = Object.values(networkInterfaces)
        .flat()
        .find((iface) => iface.family === "IPv4" && !iface.internal)?.address;

      serverInstance = http.createServer(app).listen(PORT, HOST, () => {
        console.log(`HTTP Server is running on port ${PORT}`);
        console.log(`Local: http://localhost:${PORT}`);
        if (localIP) {
          console.log(`LAN: http://${localIP}:${PORT}`);
        }
        console.log(`Environment: ${process.env.NODE_ENV}`);
        console.log("Ready to accept requests!");
      });
    } else {
      // Development mode - use HTTPS with local certificates
      const certsPath = path.join(__dirname, "certs");
      const keyPath = path.join(certsPath, "localhost-key.pem");
      const certPath = path.join(certsPath, "localhost-cert.pem");

      if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
        const httpsOptions = {
          key: fs.readFileSync(keyPath),
          cert: fs.readFileSync(certPath),
        };

        const networkInterfaces = require("os").networkInterfaces();
        const localIP = Object.values(networkInterfaces)
          .flat()
          .find((iface) => iface.family === "IPv4" && !iface.internal)?.address;

        serverInstance = https
          .createServer(httpsOptions, app)
          .listen(PORT, HOST, () => {
            console.log(`HTTPS Server is running on port ${PORT}`);
            console.log(`Local: https://localhost:${PORT}`);
            if (localIP) {
              console.log(`LAN: https://${localIP}:${PORT}`);
              console.log(
                `\nFor mobile apps, use: https://${localIP}:${PORT}/api`
              );
              console.log(
                "Note: Mobile devices may need to trust the self-signed certificate"
              );
            }
            console.log(
              `Environment: ${process.env.NODE_ENV || "development"}`
            );
            console.log("Ready to accept requests!");
          });
      } else {
        // Fallback to HTTP if no certs
        const http = require("http");
        const networkInterfaces = require("os").networkInterfaces();
        const localIP = Object.values(networkInterfaces)
          .flat()
          .find((iface) => iface.family === "IPv4" && !iface.internal)?.address;

        console.warn("SSL certificates not found, starting HTTP server...");
        serverInstance = http.createServer(app).listen(PORT, HOST, () => {
          console.log(`HTTP Server is running on port ${PORT}`);
          console.log(`Local: http://localhost:${PORT}`);
          if (localIP) {
            console.log(`LAN: http://${localIP}:${PORT}`);
            console.log(
              `\nFor mobile apps, use: http://${localIP}:${PORT}/api`
            );
          }
          console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
          console.log("Ready to accept requests!");
        });
      }
    }
    // Add error handlers to server instance
    if (serverInstance) {
      serverInstance.on("error", (err) => {
        console.error("Server error:", err);
        if (err.code === "EADDRINUSE") {
          console.error(`Port ${PORT} is already in use`);
          process.exit(1);
        }
      });

      serverInstance.on("clientError", (err, socket) => {
        console.error("Client error:", err.message);
        socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
      });
    }
  } catch (error) {
    console.error("\n=== FAILED TO START SERVER ===");
    console.error(`Error: ${error.message}`);
    console.error(`Stack: ${error.stack}`);
    console.error("=============================\n");

    // Attempt to reconnect to database after delay
    if (
      error.name === "MongoNetworkError" ||
      error.name === "MongooseServerSelectionError"
    ) {
      console.log("Will retry database connection in 5 seconds...");
      setTimeout(() => {
        console.log("Retrying server start...");
        startServer();
      }, 5000);
    } else {
      process.exit(1);
    }
  }
};

// Start the server
startServer();

console.log("\n======================================");
console.log("POSDic Server Starting...");
console.log("Press Ctrl+C to shutdown gracefully");
console.log("======================================\n");
