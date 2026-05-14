/**
 * Purchase Receipts API  — /api/purchase-receipts
 *
 * Handles supplier invoice scanning, parsing, review, and stock/cost application.
 *
 * Endpoints:
 *   POST   /parse          — Upload & parse file (no DB write, requires auth)
 *   POST   /               — Save receipt + apply product updates (requires inventory)
 *   GET    /               — List receipts (optionally filtered by provider)
 *   GET    /:id            — Single receipt detail
 *   DELETE /:id            — Delete pending receipt (requires inventory)
 */

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const router = express.Router();

const { protect, checkPermission } = require("../middleware/auth");
const PurchaseReceipt = require("../models/PurchaseReceipt");
const Product = require("../models/Product");
const StockMovement = require("../models/StockMovement");
const { parseInvoiceBuffer } = require("../services/invoice-parser");

// ---------------------------------------------------------------------------
// Storage — save uploaded invoice files to server/receipts/
// ---------------------------------------------------------------------------

const RECEIPTS_DIR = path.join(__dirname, "../receipts");
if (!fs.existsSync(RECEIPTS_DIR)) {
  fs.mkdirSync(RECEIPTS_DIR, { recursive: true });
}

const invoiceStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, RECEIPTS_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `invoice-${unique}${path.extname(file.originalname)}`);
  },
});

const ALLOWED_MIME = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "text/xml",
  "application/xml",
];

const invoiceUpload = multer({
  storage: invoiceStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace(".", "");
    const allowedExts = [
      "jpg",
      "jpeg",
      "png",
      "webp",
      "pdf",
      "xlsx",
      "xls",
      "csv",
      "xml",
    ];
    if (ALLOWED_MIME.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file type"));
    }
  },
});

// ---------------------------------------------------------------------------
// Helper — resolve file type label
// ---------------------------------------------------------------------------
function resolveFileType(mimeType, originalname) {
  const mime = (mimeType || "").toLowerCase();
  const ext = path
    .extname(originalname || "")
    .toLowerCase()
    .replace(".", "");
  if (mime.startsWith("image/") || ["jpg", "jpeg", "png", "webp"].includes(ext))
    return "image";
  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  if (
    mime.includes("spreadsheet") ||
    mime === "application/vnd.ms-excel" ||
    ["xlsx", "xls"].includes(ext)
  )
    return "excel";
  if (mime === "text/csv" || ext === "csv") return "excel";
  if (mime.includes("xml") || ext === "xml") return "xml";
  return "image";
}

function buildReceiptItems(items) {
  return items.map((item) => ({
    description: item.description,
    noIdentificacion: item.noIdentificacion || null,
    barcode: item.barcode || null,
    quantity: item.quantity || 1,
    unitCost: item.unitCost || 0,
    total: item.total || 0,
    matchedProduct: item.matchedProduct || null,
    createNew: item.createNew || false,
    included: item.included !== false,
  }));
}

function createApplyError(details) {
  const error = new Error("Failed to apply purchase receipt");
  error.statusCode = 400;
  error.details = Array.isArray(details) ? details : [details];
  return error;
}

async function findDuplicateProductForIdentifier(identifier) {
  if (!identifier) {
    return null;
  }

  return Product.findOne({
    $or: [
      { ean: identifier },
      { ean13: identifier },
      { upc: identifier },
      { product_id: identifier },
      { sku: identifier },
    ],
  });
}

async function validateConfirmedItems(items) {
  const plannedItems = [];
  const validationErrors = [];
  const seenNewIdentifiers = new Set();

  for (const item of items) {
    if (item.included === false) {
      continue;
    }

    if (!item.description || typeof item.description !== "string") {
      validationErrors.push("Each included item must have a description");
      continue;
    }

    const quantity = Number(item.quantity || 0);
    const unitCost = Number(item.unitCost || 0);
    const total = Number(item.total || quantity * unitCost);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      validationErrors.push(
        `Item \"${item.description}\" must have quantity greater than 0`
      );
      continue;
    }

    if (!Number.isFinite(unitCost) || unitCost < 0) {
      validationErrors.push(
        `Item \"${item.description}\" must have a valid unit cost`
      );
      continue;
    }

    if (item.matchedProduct && item.createNew) {
      validationErrors.push(
        `Item \"${item.description}\" cannot update and create at the same time`
      );
      continue;
    }

    if (item.matchedProduct) {
      const product = await Product.findById(item.matchedProduct);
      if (!product) {
        validationErrors.push(
          `Matched product not found for \"${item.description}\"`
        );
        continue;
      }

      plannedItems.push({
        mode: "update",
        item: { ...item, quantity, unitCost, total },
        product,
      });
      continue;
    }

    if (!item.createNew) {
      validationErrors.push(
        `Item \"${item.description}\" must be matched to an existing product or marked to create a new product`
      );
      continue;
    }

    const identifier = item.barcode || item.noIdentificacion || null;

    if (identifier && seenNewIdentifiers.has(identifier)) {
      validationErrors.push(
        `Duplicate new product identifier \"${identifier}\" in the same batch`
      );
      continue;
    }

    if (identifier) {
      seenNewIdentifiers.add(identifier);
      const duplicate = await findDuplicateProductForIdentifier(identifier);
      if (duplicate) {
        validationErrors.push(
          `A product with identifier \"${identifier}\" already exists and cannot be created again`
        );
        continue;
      }
    }

    plannedItems.push({
      mode: "create",
      item: { ...item, quantity, unitCost, total },
      identifier,
    });
  }

  if (validationErrors.length > 0) {
    throw createApplyError(validationErrors);
  }

  return plannedItems;
}

async function rollbackOperations(rollbackSteps) {
  for (const rollbackStep of rollbackSteps.reverse()) {
    try {
      await rollbackStep();
    } catch (rollbackError) {
      console.error("[purchase-receipts/rollback]", rollbackError.message);
    }
  }
}

// ---------------------------------------------------------------------------
// POST /parse — Upload file, parse it, return extracted data (no DB write)
// ---------------------------------------------------------------------------
router.post(
  "/parse",
  protect,
  invoiceUpload.single("invoice"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    try {
      const fileBuffer = fs.readFileSync(req.file.path);
      const parsed = await parseInvoiceBuffer(
        fileBuffer,
        req.file.mimetype,
        req.file.originalname
      );

      const fileType = resolveFileType(
        req.file.mimetype,
        req.file.originalname
      );
      const storagePath = `receipts/${req.file.filename}`;

      res.json({
        ...parsed,
        fileType,
        storagePath,
        originalFilename: req.file.originalname,
        visionUnavailable: parsed.visionUnavailable || false,
      });
    } catch (err) {
      console.error("[purchase-receipts/parse]", err.message);
      // Clean up saved file on parse error
      try {
        fs.unlinkSync(req.file.path);
      } catch (_) {}
      res
        .status(400)
        .json({ message: err.message || "Failed to parse invoice" });
    }
  }
);

// ---------------------------------------------------------------------------
// POST / — Save receipt + apply product cost/stock updates
// ---------------------------------------------------------------------------
router.post("/", protect, checkPermission("inventory"), async (req, res) => {
  const {
    providerId,
    originalFilename,
    fileType,
    storagePath,
    invoiceNumber,
    invoiceDate,
    providerRfc,
    providerName,
    totals,
    confirmedItems,
    notes,
  } = req.body;

  if (!providerId || !originalFilename || !fileType) {
    return res
      .status(400)
      .json({
        message: "providerId, originalFilename, and fileType are required",
      });
  }

  const items = Array.isArray(confirmedItems) ? confirmedItems : [];
  const rollbackSteps = [];

  try {
    const plannedItems = await validateConfirmedItems(items);
    const receipt = await PurchaseReceipt.create({
      provider: providerId,
      originalFilename,
      fileType,
      storagePath: storagePath || null,
      invoiceNumber: invoiceNumber || null,
      invoiceDate: invoiceDate || null,
      providerRfc: providerRfc || null,
      providerName: providerName || null,
      parsedItems: buildReceiptItems(items),
      totals: totals || { subtotal: 0, tax: 0, total: 0 },
      status: "pending",
      notes: notes || null,
    });

    rollbackSteps.push(async () => {
      await PurchaseReceipt.findByIdAndDelete(receipt._id);
    });

    for (const planned of plannedItems) {
      if (planned.mode === "update") {
        const previousStock = planned.product.stock || 0;
        const previousCost = planned.product.cost || 0;
        const newStock = previousStock + planned.item.quantity;

        const updatedProduct = await Product.findByIdAndUpdate(
          planned.product._id,
          {
            $set: { cost: planned.item.unitCost },
            $inc: { stock: planned.item.quantity },
          },
          { new: true }
        );

        if (!updatedProduct) {
          throw createApplyError(
            `Matched product not found for \"${planned.item.description}\" during apply`
          );
        }

        rollbackSteps.push(async () => {
          await Product.findByIdAndUpdate(planned.product._id, {
            $set: {
              cost: previousCost,
              stock: previousStock,
            },
          });
        });

        const movement = await StockMovement.create({
          product: planned.product._id,
          sourceType: "purchase_receipt",
          sourceId: receipt._id,
          movementType: "increase",
          quantityChange: planned.item.quantity,
          previousStock,
          newStock,
          unitCost: planned.item.unitCost,
          performedBy: req.user._id,
          notes: planned.item.description,
          metadata: {
            provider: providerId,
            invoiceNumber: invoiceNumber || null,
            originalFilename,
          },
        });

        rollbackSteps.push(async () => {
          await StockMovement.findByIdAndDelete(movement._id);
        });
        continue;
      }

      const uniqueSuffix = `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 6)
        .toUpperCase()}`;
      const createdProduct = await Product.create({
        product_id: planned.identifier || `IMP-${uniqueSuffix}`,
        name: planned.item.description,
        sku: planned.identifier || `IMP-${uniqueSuffix}`,
        cost: planned.item.unitCost,
        price: 0,
        stock: planned.item.quantity,
        category: "General",
        provider: providerId,
        incompleteInfo: true,
        active: true,
        available: false,
        ...(planned.identifier ? { ean: planned.identifier } : {}),
      });

      rollbackSteps.push(async () => {
        await Product.findByIdAndDelete(createdProduct._id);
      });

      const movement = await StockMovement.create({
        product: createdProduct._id,
        sourceType: "purchase_receipt",
        sourceId: receipt._id,
        movementType: "increase",
        quantityChange: planned.item.quantity,
        previousStock: 0,
        newStock: planned.item.quantity,
        unitCost: planned.item.unitCost,
        performedBy: req.user._id,
        notes: planned.item.description,
        metadata: {
          provider: providerId,
          invoiceNumber: invoiceNumber || null,
          originalFilename,
          createdProduct: true,
        },
      });

      rollbackSteps.push(async () => {
        await StockMovement.findByIdAndDelete(movement._id);
      });
    }

    receipt.status = "applied";
    receipt.appliedAt = new Date();
    receipt.appliedBy = req.user._id;
    await receipt.save();

    res.status(201).json(receipt.toObject());
  } catch (err) {
    await rollbackOperations(rollbackSteps);

    console.error("[purchase-receipts/apply]", err.message);
    return res.status(err.statusCode || 400).json({
      message: "Failed to apply purchase receipt",
      errors: err.details || [err.message],
    });
  }
});

// ---------------------------------------------------------------------------
// GET / — List receipts, optionally filtered by provider
// ---------------------------------------------------------------------------
router.get("/", protect, async (req, res) => {
  const { provider, page = 1, pageSize = 20 } = req.query;
  const filter = {};
  if (provider) filter.provider = provider;

  const total = await PurchaseReceipt.countDocuments(filter);
  const data = await PurchaseReceipt.find(filter)
    .sort({ createdAt: -1 })
    .skip((parseInt(page) - 1) * parseInt(pageSize))
    .limit(parseInt(pageSize))
    .populate("provider", "name code")
    .populate("appliedBy", "username fullName");

  res.json({
    data,
    pagination: {
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      totalPages: Math.ceil(total / parseInt(pageSize)),
    },
  });
});

// ---------------------------------------------------------------------------
// GET /:id — Single receipt detail
// ---------------------------------------------------------------------------
router.get("/:id", protect, async (req, res) => {
  const receipt = await PurchaseReceipt.findById(req.params.id)
    .populate("provider", "name code")
    .populate("parsedItems.matchedProduct", "name ean sku")
    .populate("appliedBy", "username fullName");

  if (!receipt) return res.status(404).json({ message: "Receipt not found" });
  res.json(receipt);
});

// ---------------------------------------------------------------------------
// DELETE /:id — Delete only pending receipts
// ---------------------------------------------------------------------------
router.delete(
  "/:id",
  protect,
  checkPermission("inventory"),
  async (req, res) => {
    const receipt = await PurchaseReceipt.findById(req.params.id);
    if (!receipt) return res.status(404).json({ message: "Receipt not found" });

    if (receipt.status === "applied") {
      return res
        .status(400)
        .json({ message: "Cannot delete an already-applied receipt" });
    }

    // Clean up stored file if present
    if (receipt.storagePath) {
      const fullPath = path.join(__dirname, "..", receipt.storagePath);
      try {
        fs.unlinkSync(fullPath);
      } catch (_) {}
    }

    await receipt.deleteOne();
    res.json({ message: "Receipt deleted" });
  }
);

module.exports = router;
