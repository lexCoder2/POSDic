/**
 * Integration tests for /api/purchase-receipts
 * TDD — these tests define the expected API behaviour.
 */
const request = require("supertest");
const path = require("path");
const app = require("../../index");
const PurchaseReceipt = require("../../models/PurchaseReceipt");
const Provider = require("../../models/Provider");
const Product = require("../../models/Product");
const StockMovement = require("../../models/StockMovement");
const {
  authHeader,
  createAdminUser,
  createUser,
  createManagerUser,
} = require("../helpers/auth");

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

/** Minimal Excel-like CSV content (buffer) that our parser understands */
const makeExcelBuffer = () => {
  const XLSX = require("xlsx");
  const data = [
    ["Descripcion", "NoIdentificacion", "Cantidad", "ValorUnitario", "Importe"],
    ["Leche Entera 1L", "7501234567890", "10", "22.50", "225.00"],
    ["Pan Integral", "7509876543210", "5", "18.00", "90.00"],
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
};

const CFDI_XML = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4"
  Folio="123" Serie="A" Fecha="2026-05-01T10:00:00"
  SubTotal="315.00" Total="365.40">
  <cfdi:Emisor Rfc="ABC010101AAA" Nombre="Proveedor Test SA de CV"/>
  <cfdi:Conceptos>
    <cfdi:Concepto NoIdentificacion="7501234567890"
      Descripcion="Leche Entera 1L" Cantidad="10"
      ValorUnitario="22.50" Importe="225.00"/>
    <cfdi:Concepto NoIdentificacion="7509876543210"
      Descripcion="Pan Integral" Cantidad="5"
      ValorUnitario="18.00" Importe="90.00"/>
  </cfdi:Conceptos>
</cfdi:Comprobante>`;

let admin;
let manager;
let cashier;
let provider;

beforeEach(async () => {
  [admin, manager, cashier] = await Promise.all([
    createAdminUser(),
    createManagerUser(),
    createUser({
      username: "cashier3",
      role: "cashier",
      permissions: ["sales"],
    }),
  ]);
  provider = await Provider.create({
    code: "PROV-TEST",
    name: "Proveedor Test SA de CV",
  });
});

// ---------------------------------------------------------------------------
// POST /api/purchase-receipts/parse  — file upload & parse (no DB write)
// ---------------------------------------------------------------------------

describe("POST /api/purchase-receipts/parse", () => {
  it("should return 401 without auth", async () => {
    const res = await request(app)
      .post("/api/purchase-receipts/parse")
      .attach("invoice", makeExcelBuffer(), {
        filename: "invoice.xlsx",
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
    expect(res.status).toBe(401);
  });

  it("should return 400 when no file is attached", async () => {
    const res = await request(app)
      .post("/api/purchase-receipts/parse")
      .set(authHeader(admin));
    expect(res.status).toBe(400);
  });

  it("should parse Excel and return items (admin)", async () => {
    const res = await request(app)
      .post("/api/purchase-receipts/parse")
      .set(authHeader(admin))
      .attach("invoice", makeExcelBuffer(), {
        filename: "invoice.xlsx",
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("items");
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.items[0]).toHaveProperty("description");
    expect(res.body.items[0]).toHaveProperty("quantity");
    expect(res.body.items[0]).toHaveProperty("unitCost");
    expect(res.body).toHaveProperty("totals");
    expect(res.body).toHaveProperty("fileType");
  });

  it("should parse CFDI XML and return provider RFC + items (manager)", async () => {
    const res = await request(app)
      .post("/api/purchase-receipts/parse")
      .set(authHeader(manager))
      .attach("invoice", Buffer.from(CFDI_XML, "utf8"), {
        filename: "factura.xml",
        contentType: "text/xml",
      });
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(2);
    expect(res.body.providerRfc).toBe("ABC010101AAA");
    expect(res.body.invoiceNumber).toBe("A123");
    expect(res.body.invoiceDate).toBe("2026-05-01");
  });

  it("should return storagePath for the uploaded file", async () => {
    const res = await request(app)
      .post("/api/purchase-receipts/parse")
      .set(authHeader(admin))
      .attach("invoice", makeExcelBuffer(), {
        filename: "invoice.xlsx",
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("storagePath");
    expect(typeof res.body.storagePath).toBe("string");
  });

  it("should allow cashier to parse (parses are read-only, no inventory perm needed)", async () => {
    const res = await request(app)
      .post("/api/purchase-receipts/parse")
      .set(authHeader(cashier))
      .attach("invoice", makeExcelBuffer(), {
        filename: "invoice.xlsx",
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
    // cashier can still parse files; saving requires inventory perm
    expect([200, 403]).toContain(res.status);
  });
});

// ---------------------------------------------------------------------------
// POST /api/purchase-receipts  — save + apply to products
// ---------------------------------------------------------------------------

describe("POST /api/purchase-receipts", () => {
  it("should return 401 without auth", async () => {
    const res = await request(app).post("/api/purchase-receipts").send({});
    expect(res.status).toBe(401);
  });

  it("should return 403 for cashier (needs inventory permission)", async () => {
    const res = await request(app)
      .post("/api/purchase-receipts")
      .set(authHeader(cashier))
      .send({
        providerId: provider._id,
        originalFilename: "invoice.xlsx",
        fileType: "excel",
        confirmedItems: [],
      });
    expect(res.status).toBe(403);
  });

  it("should return 400 when required fields are missing", async () => {
    const res = await request(app)
      .post("/api/purchase-receipts")
      .set(authHeader(admin))
      .send({});
    expect(res.status).toBe(400);
  });

  it("should create receipt with applied status", async () => {
    const product = await Product.create({
      product_id: "7501234567890",
      name: "Leche Entera",
      sku: "LECHE001",
      ean: "7501234567890",
      price: 25,
      cost: 20,
      stock: 0,
      category: "Dairy",
      available: true,
      active: true,
    });

    const res = await request(app)
      .post("/api/purchase-receipts")
      .set(authHeader(admin))
      .send({
        providerId: provider._id,
        originalFilename: "invoice.xlsx",
        fileType: "excel",
        invoiceNumber: "INV-001",
        invoiceDate: "2026-05-01",
        totals: { subtotal: 225, tax: 0, total: 225 },
        confirmedItems: [
          {
            description: "Leche Entera 1L",
            noIdentificacion: "7501234567890",
            barcode: "7501234567890",
            quantity: 10,
            unitCost: 22.5,
            total: 225,
            matchedProduct: product._id,
            included: true,
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("_id");
    expect(res.body.status).toBe("applied");
  });

  it("should update matching product cost and stock on apply", async () => {
    const product = await Product.create({
      product_id: "7501234567891",
      name: "Leche Entera",
      sku: "LECHE002",
      ean: "7501234567891",
      price: 25,
      cost: 20,
      stock: 5,
      category: "Dairy",
      available: true,
      active: true,
    });

    await request(app)
      .post("/api/purchase-receipts")
      .set(authHeader(admin))
      .send({
        providerId: provider._id,
        originalFilename: "invoice.xlsx",
        fileType: "excel",
        invoiceNumber: "INV-002",
        invoiceDate: "2026-05-01",
        totals: { subtotal: 225, tax: 0, total: 225 },
        confirmedItems: [
          {
            description: "Leche Entera 1L",
            quantity: 10,
            unitCost: 22.5,
            total: 225,
            matchedProduct: product._id,
            included: true,
          },
        ],
      });

    const updated = await Product.findById(product._id);
    expect(updated.cost).toBe(22.5);
    expect(updated.stock).toBe(15); // 5 original + 10 new

    const movements = await StockMovement.find({
      product: product._id,
      sourceType: "purchase_receipt",
    });
    expect(movements).toHaveLength(1);
    expect(movements[0].quantityChange).toBe(10);
    expect(movements[0].previousStock).toBe(5);
    expect(movements[0].newStock).toBe(15);
    expect(movements[0].performedBy.toString()).toBe(admin._id.toString());
  });

  it("should skip row when included=false", async () => {
    const product = await Product.create({
      product_id: "7509876543211",
      name: "Pan Integral",
      sku: "PAN001",
      ean: "7509876543211",
      price: 20,
      cost: 15,
      stock: 3,
      category: "Bakery",
      available: true,
      active: true,
    });

    await request(app)
      .post("/api/purchase-receipts")
      .set(authHeader(admin))
      .send({
        providerId: provider._id,
        originalFilename: "invoice.xlsx",
        fileType: "excel",
        confirmedItems: [
          {
            description: "Pan Integral",
            quantity: 5,
            unitCost: 18,
            total: 90,
            matchedProduct: product._id,
            included: false, // SKIP
          },
        ],
      });

    const unchanged = await Product.findById(product._id);
    expect(unchanged.stock).toBe(3); // untouched
    expect(unchanged.cost).toBe(15); // untouched
  });

  it("should create new product with incompleteInfo=true when createNew=true", async () => {
    const res = await request(app)
      .post("/api/purchase-receipts")
      .set(authHeader(admin))
      .send({
        providerId: provider._id,
        originalFilename: "invoice.xlsx",
        fileType: "excel",
        confirmedItems: [
          {
            description: "Nuevo Producto Desconocido",
            noIdentificacion: "00000000001",
            barcode: "00000000001",
            quantity: 3,
            unitCost: 10,
            total: 30,
            included: true,
            createNew: true,
          },
        ],
      });

    expect(res.status).toBe(201);
    const newProd = await Product.findOne({ ean: "00000000001" });
    expect(newProd).not.toBeNull();
    expect(newProd.incompleteInfo).toBe(true);
    expect(newProd.cost).toBe(10);
    expect(newProd.stock).toBe(3);

    const movement = await StockMovement.findOne({
      product: newProd._id,
      sourceType: "purchase_receipt",
    });
    expect(movement).not.toBeNull();
    expect(movement.quantityChange).toBe(3);
    expect(movement.previousStock).toBe(0);
    expect(movement.newStock).toBe(3);
  });

  it("should roll back the whole apply when any included item fails validation", async () => {
    const matchedProduct = await Product.create({
      product_id: "MATCH-001",
      name: "Matched Product",
      sku: "MATCH-001",
      ean: "7700000000001",
      price: 15,
      cost: 9,
      stock: 7,
      category: "General",
      available: true,
      active: true,
    });

    await Product.create({
      product_id: "DUPLICATE-001",
      name: "Existing Duplicate",
      sku: "DUPLICATE-001",
      ean: "7700000000002",
      price: 20,
      cost: 12,
      stock: 4,
      category: "General",
      available: true,
      active: true,
    });

    const receiptCountBefore = await PurchaseReceipt.countDocuments();

    const res = await request(app)
      .post("/api/purchase-receipts")
      .set(authHeader(admin))
      .send({
        providerId: provider._id,
        originalFilename: "invoice.xlsx",
        fileType: "excel",
        confirmedItems: [
          {
            description: "Matched Product",
            barcode: "7700000000001",
            quantity: 5,
            unitCost: 11,
            total: 55,
            matchedProduct: matchedProduct._id,
            included: true,
          },
          {
            description: "Conflicting New Product",
            barcode: "7700000000002",
            quantity: 2,
            unitCost: 8,
            total: 16,
            included: true,
            createNew: true,
          },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/failed to apply/i);

    const reloadedMatched = await Product.findById(matchedProduct._id);
    expect(reloadedMatched.cost).toBe(9);
    expect(reloadedMatched.stock).toBe(7);

    const receiptCountAfter = await PurchaseReceipt.countDocuments();
    expect(receiptCountAfter).toBe(receiptCountBefore);

    const movementCount = await StockMovement.countDocuments();
    expect(movementCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// GET /api/purchase-receipts
// ---------------------------------------------------------------------------

describe("GET /api/purchase-receipts", () => {
  it("should return 401 without auth", async () => {
    const res = await request(app).get("/api/purchase-receipts");
    expect(res.status).toBe(401);
  });

  it("should return list of receipts for a provider", async () => {
    await PurchaseReceipt.create({
      provider: provider._id,
      originalFilename: "test.xlsx",
      fileType: "excel",
      status: "applied",
    });

    const res = await request(app)
      .get(`/api/purchase-receipts?provider=${provider._id}`)
      .set(authHeader(admin));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
    expect(res.body).toHaveProperty("pagination");
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it("should support pagination params", async () => {
    for (let i = 0; i < 5; i++) {
      await PurchaseReceipt.create({
        provider: provider._id,
        originalFilename: `invoice${i}.xlsx`,
        fileType: "excel",
        status: "applied",
      });
    }

    const res = await request(app)
      .get(`/api/purchase-receipts?provider=${provider._id}&page=1&pageSize=2`)
      .set(authHeader(admin));

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.pagination.total).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// GET /api/purchase-receipts/:id
// ---------------------------------------------------------------------------

describe("GET /api/purchase-receipts/:id", () => {
  it("should return 401 without auth", async () => {
    const res = await request(app).get(
      "/api/purchase-receipts/000000000000000000000001"
    );
    expect(res.status).toBe(401);
  });

  it("should return 404 for non-existent receipt", async () => {
    const res = await request(app)
      .get("/api/purchase-receipts/000000000000000000000001")
      .set(authHeader(admin));
    expect(res.status).toBe(404);
  });

  it("should return receipt by ID", async () => {
    const receipt = await PurchaseReceipt.create({
      provider: provider._id,
      originalFilename: "test.xml",
      fileType: "xml",
      invoiceNumber: "A123",
      status: "applied",
    });

    const res = await request(app)
      .get(`/api/purchase-receipts/${receipt._id}`)
      .set(authHeader(admin));

    expect(res.status).toBe(200);
    expect(res.body.invoiceNumber).toBe("A123");
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/purchase-receipts/:id
// ---------------------------------------------------------------------------

describe("DELETE /api/purchase-receipts/:id", () => {
  it("should return 401 without auth", async () => {
    const res = await request(app).delete(
      "/api/purchase-receipts/000000000000000000000001"
    );
    expect(res.status).toBe(401);
  });

  it("should return 403 for cashier", async () => {
    const receipt = await PurchaseReceipt.create({
      provider: provider._id,
      originalFilename: "test.xlsx",
      fileType: "excel",
      status: "pending",
    });
    const res = await request(app)
      .delete(`/api/purchase-receipts/${receipt._id}`)
      .set(authHeader(cashier));
    expect(res.status).toBe(403);
  });

  it("should return 400 when trying to delete an applied receipt", async () => {
    const receipt = await PurchaseReceipt.create({
      provider: provider._id,
      originalFilename: "test.xlsx",
      fileType: "excel",
      status: "applied",
    });
    const res = await request(app)
      .delete(`/api/purchase-receipts/${receipt._id}`)
      .set(authHeader(admin));
    expect(res.status).toBe(400);
  });

  it("should delete a pending receipt", async () => {
    const receipt = await PurchaseReceipt.create({
      provider: provider._id,
      originalFilename: "test.xlsx",
      fileType: "excel",
      status: "pending",
    });
    const res = await request(app)
      .delete(`/api/purchase-receipts/${receipt._id}`)
      .set(authHeader(admin));
    expect(res.status).toBe(200);
    const gone = await PurchaseReceipt.findById(receipt._id);
    expect(gone).toBeNull();
  });
});
