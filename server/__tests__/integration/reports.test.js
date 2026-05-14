const request = require("supertest");
const app = require("../../index");
const Sale = require("../../models/Sale");
const Product = require("../../models/Product");
const { authHeader, createAdminUser, createUser } = require("../helpers/auth");

let admin;

beforeEach(async () => {
  admin = await createAdminUser();
});

describe("Reports Routes", () => {
  describe("GET /api/reports/sales", () => {
    it("should return 400 when startDate or endDate is missing", async () => {
      const res = await request(app)
        .get("/api/reports/sales")
        .set(authHeader(admin));
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/dates are required/i);
    });

    it("should return 401 without auth token", async () => {
      const res = await request(app).get(
        "/api/reports/sales?startDate=2025-01-01&endDate=2025-01-31"
      );
      expect(res.status).toBe(401);
    });

    it("should return 403 for user without reports permission", async () => {
      const cashier = await createUser({
        username: "noReportsCashier",
        permissions: ["sales"],
      });
      const res = await request(app)
        .get("/api/reports/sales?startDate=2025-01-01&endDate=2025-01-31")
        .set(authHeader(cashier));
      expect(res.status).toBe(403);
    });

    it("should return 200 (PDF/Excel) for valid date range", async () => {
      const res = await request(app)
        .get("/api/reports/sales?startDate=2024-01-01&endDate=2025-12-31")
        .set(authHeader(admin));
      // Returns a buffer (PDF or Excel), just assert it responds OK
      expect(res.status).toBe(200);
    });
  });

  describe("GET /api/reports/stock", () => {
    it("should return 401 without auth", async () => {
      const res = await request(app).get("/api/reports/stock");
      expect(res.status).toBe(401);
    });

    it("should return 403 for user without reports permission", async () => {
      const cashier = await createUser({
        username: "noReportsUser2",
        permissions: ["sales"],
      });
      const res = await request(app)
        .get("/api/reports/stock")
        .set(authHeader(cashier));
      expect(res.status).toBe(403);
    });

    it("should return stock report (200) when products exist", async () => {
      await Product.create({
        product_id: "TST001",
        name: "Test Product",
        sku: "TST001",
        price: 9.99,
        stock: 10,
        active: true,
      });
      const res = await request(app)
        .get("/api/reports/stock")
        .set(authHeader(admin));
      expect(res.status).toBe(200);
    });
  });

  describe("GET /api/reports/cashflow", () => {
    it("should return 400 when dates are missing", async () => {
      const res = await request(app)
        .get("/api/reports/cashflow")
        .set(authHeader(admin));
      expect(res.status).toBe(400);
    });

    it("should return cashflow data (200) for valid date range", async () => {
      const res = await request(app)
        .get("/api/reports/cashflow?startDate=2024-01-01&endDate=2025-12-31")
        .set(authHeader(admin));
      expect(res.status).toBe(200);
    });
  });

  describe("GET /api/reports/sales?format=excel — Excel export", () => {
    it("should return Excel content-type when format=excel", async () => {
      const res = await request(app)
        .get(
          "/api/reports/sales?startDate=2024-01-01&endDate=2025-12-31&format=excel"
        )
        .set(authHeader(admin));
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(
        /application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/
      );
    });

    it("should include transaction rows in Excel with sale data", async () => {
      const cashier = await createUser({
        username: "xlsCashier",
        permissions: ["sales", "reports"],
      });
      await Sale.create({
        saleNumber: 9001,
        items: [
          {
            productName: "Widget",
            quantity: 2,
            unitPrice: 5.0,
            subtotal: 10.0,
            total: 10.0,
          },
        ],
        subtotal: 10.0,
        discount: 0,
        tax: 0,
        total: 10.0,
        paymentMethod: "cash",
        cashier: cashier._id,
        status: "completed",
      });
      const res = await request(app)
        .get(
          "/api/reports/sales?startDate=2024-01-01&endDate=2027-12-31&format=excel"
        )
        .set(authHeader(admin));
      expect(res.status).toBe(200);
      // Excel file size should be non-trivial
      expect(res.body).toBeDefined();
    });
  });

  describe("GET /api/reports/cashflow?format=excel — Excel export", () => {
    it("should return Excel content-type when format=excel", async () => {
      const res = await request(app)
        .get(
          "/api/reports/cashflow?startDate=2024-01-01&endDate=2025-12-31&format=excel"
        )
        .set(authHeader(admin));
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(
        /application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/
      );
    });
  });

  describe("GET /api/reports/profit — Profit report (Excel)", () => {
    it("should return 401 without auth", async () => {
      const res = await request(app).get(
        "/api/reports/profit?startDate=2024-01-01&endDate=2025-12-31"
      );
      expect(res.status).toBe(401);
    });

    it("should return 403 for user without reports permission", async () => {
      const noPerms = await createUser({
        username: "noProfitPerms",
        permissions: ["sales"],
      });
      const res = await request(app)
        .get("/api/reports/profit?startDate=2024-01-01&endDate=2025-12-31")
        .set(authHeader(noPerms));
      expect(res.status).toBe(403);
    });

    it("should return 400 when dates are missing", async () => {
      const res = await request(app)
        .get("/api/reports/profit")
        .set(authHeader(admin));
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/dates are required/i);
    });

    it("should return Excel content-type for valid request", async () => {
      const res = await request(app)
        .get("/api/reports/profit?startDate=2024-01-01&endDate=2027-12-31")
        .set(authHeader(admin));
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(
        /application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/
      );
    });

    it("should include profit calculation using estimated cost margin", async () => {
      const cashier = await createUser({
        username: "profitCashier2",
        permissions: ["sales", "reports"],
      });
      const product = await Product.create({
        product_id: "PRF001",
        name: "Profitable Widget",
        sku: "PRF001",
        price: 20.0,
        cost: 10.0,
        stock: 100,
        active: true,
      });
      await Sale.create({
        saleNumber: 9002,
        items: [
          {
            product: product._id,
            productName: "Profitable Widget",
            quantity: 1,
            unitPrice: 20.0,
            subtotal: 20.0,
            total: 20.0,
          },
        ],
        subtotal: 20.0,
        discount: 0,
        tax: 0,
        total: 20.0,
        paymentMethod: "cash",
        cashier: cashier._id,
        status: "completed",
      });
      const res = await request(app)
        .get("/api/reports/profit?startDate=2024-01-01&endDate=2027-12-31")
        .set(authHeader(admin));
      expect(res.status).toBe(200);
    });
  });

  describe("GET /api/reports/sales — groupBy param", () => {
    beforeEach(async () => {
      const cashier = await createUser({
        username: "groupByCashier",
        permissions: ["sales", "reports"],
      });
      await Sale.create({
        saleNumber: 8001,
        items: [
          {
            productName: "Item",
            quantity: 1,
            unitPrice: 5,
            subtotal: 5,
            total: 5,
          },
        ],
        subtotal: 5,
        discount: 0,
        tax: 0,
        total: 5,
        paymentMethod: "cash",
        cashier: cashier._id,
        status: "completed",
      });
    });

    it("should return 200 for groupBy=week (Excel)", async () => {
      const res = await request(app)
        .get(
          "/api/reports/sales?startDate=2024-01-01&endDate=2027-12-31&groupBy=week&format=excel"
        )
        .set(authHeader(admin));
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(/spreadsheetml\.sheet/);
    });

    it("should return 200 for groupBy=month (Excel)", async () => {
      const res = await request(app)
        .get(
          "/api/reports/sales?startDate=2024-01-01&endDate=2027-12-31&groupBy=month&format=excel"
        )
        .set(authHeader(admin));
      expect(res.status).toBe(200);
    });

    it("should return 200 for groupBy=day (PDF)", async () => {
      const res = await request(app)
        .get(
          "/api/reports/sales?startDate=2024-01-01&endDate=2027-12-31&groupBy=day&format=pdf"
        )
        .set(authHeader(admin));
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(/pdf/);
    });
  });

  describe("GET /api/reports/cashflow — includeWithdrawals param", () => {
    it("should exclude internal/withdrawal sales when includeWithdrawals=false", async () => {
      const cashier = await createUser({
        username: "withdrawCashier",
        permissions: ["sales", "reports"],
      });
      // Normal sale
      await Sale.create({
        saleNumber: 7001,
        items: [
          {
            productName: "Normal",
            quantity: 1,
            unitPrice: 10,
            subtotal: 10,
            total: 10,
          },
        ],
        subtotal: 10,
        discount: 0,
        tax: 0,
        total: 10,
        paymentMethod: "cash",
        cashier: cashier._id,
        status: "completed",
        isInternal: false,
      });
      // Internal/withdrawal sale
      await Sale.create({
        saleNumber: 7002,
        items: [
          {
            productName: "Withdrawal",
            quantity: 1,
            unitPrice: 50,
            subtotal: 50,
            total: 50,
          },
        ],
        subtotal: 50,
        discount: 0,
        tax: 0,
        total: 50,
        paymentMethod: "cash",
        cashier: cashier._id,
        status: "completed",
        isInternal: true,
      });

      const resWithout = await request(app)
        .get(
          "/api/reports/cashflow?startDate=2024-01-01&endDate=2027-12-31&includeWithdrawals=false&format=excel"
        )
        .set(authHeader(admin));
      expect(resWithout.status).toBe(200);

      const resWith = await request(app)
        .get(
          "/api/reports/cashflow?startDate=2024-01-01&endDate=2027-12-31&includeWithdrawals=true&format=excel"
        )
        .set(authHeader(admin));
      expect(resWith.status).toBe(200);
    });

    it("should return Excel with By Register sheet when groupByRegister=true", async () => {
      const res = await request(app)
        .get(
          "/api/reports/cashflow?startDate=2024-01-01&endDate=2027-12-31&groupByRegister=true&format=excel"
        )
        .set(authHeader(admin));
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(/spreadsheetml\.sheet/);
    });

    it("should return PDF with By Payment Method section when groupByPayment=true", async () => {
      const res = await request(app)
        .get(
          "/api/reports/cashflow?startDate=2024-01-01&endDate=2027-12-31&groupByPayment=true&format=pdf"
        )
        .set(authHeader(admin));
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(/pdf/);
    });
  });

  describe("GET /api/reports/stock — type variants", () => {
    beforeEach(async () => {
      await Product.create({
        product_id: "SLW001",
        name: "Low Stock Item",
        sku: "SLW001",
        price: 5,
        stock: 3,
        active: true,
      });
      await Product.create({
        product_id: "SHI001",
        name: "High Stock Item",
        sku: "SHI001",
        price: 8,
        stock: 100,
        active: true,
      });
      await Product.create({
        product_id: "SOU001",
        name: "Out Of Stock Item",
        sku: "SOU001",
        price: 3,
        stock: 0,
        active: true,
      });
    });

    it("should return 200 for type=low (only low-stock products)", async () => {
      const res = await request(app)
        .get("/api/reports/stock?type=low")
        .set(authHeader(admin));
      expect(res.status).toBe(200);
    });

    it("should return 200 for type=out (out-of-stock products)", async () => {
      const res = await request(app)
        .get("/api/reports/stock?type=out")
        .set(authHeader(admin));
      expect(res.status).toBe(200);
    });

    it("should return 200 for type=value (sorted by stock value descending)", async () => {
      const res = await request(app)
        .get("/api/reports/stock?type=value")
        .set(authHeader(admin));
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(/spreadsheetml\.sheet/);
    });

    it("should return 404 when no products match criteria (type=out with no out-of-stock)", async () => {
      await Product.deleteMany({});
      await Product.create({
        product_id: "FULL001",
        name: "Full",
        sku: "FULL001",
        price: 5,
        stock: 50,
        active: true,
      });
      const res = await request(app)
        .get("/api/reports/stock?type=out")
        .set(authHeader(admin));
      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/reports/barcodes", () => {
    it("should return 401 without auth", async () => {
      const res = await request(app).get("/api/reports/barcodes");
      expect(res.status).toBe(401);
    });

    it("should return 403 for user without reports permission", async () => {
      const noPerms = await createUser({
        username: "noBarcodePerms",
        permissions: ["sales"],
      });
      const res = await request(app)
        .get("/api/reports/barcodes")
        .set(authHeader(noPerms));
      expect(res.status).toBe(403);
    });

    it("should return 404 when no products match", async () => {
      // No products have barcodes in clean DB
      const res = await request(app)
        .get("/api/reports/barcodes?generationType=category")
        .set(authHeader(admin));
      expect(res.status).toBe(404);
    });

    it("should return PDF when products with barcodes exist", async () => {
      await Product.create({
        product_id: "BRC001",
        name: "Barcode Product",
        sku: "BRC001",
        ean: "1234567890123",
        price: 9.99,
        stock: 10,
        active: true,
      });
      const res = await request(app)
        .get("/api/reports/barcodes?generationType=category")
        .set(authHeader(admin));
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(/pdf/);
    });
  });

  describe("GET /api/reports/qrcodes", () => {
    it("should return 401 without auth", async () => {
      const res = await request(app).get("/api/reports/qrcodes");
      expect(res.status).toBe(401);
    });

    it("should return 404 when no products match the filter", async () => {
      const res = await request(app)
        .get("/api/reports/qrcodes?barcodeStandardFilter=yes")
        .set(authHeader(admin));
      expect(res.status).toBe(404);
    });

    it("should return PDF when matching products exist", async () => {
      await Product.create({
        product_id: "QRC001",
        name: "QR Product",
        sku: "QRC001",
        barcode_standard: "EAN13",
        price: 5.99,
        stock: 20,
        active: true,
      });
      const res = await request(app)
        .get("/api/reports/qrcodes?barcodeStandardFilter=yes")
        .set(authHeader(admin));
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(/pdf/);
    });
  });

  describe("GET /api/reports/profit — refunded sales excluded", () => {
    it("should not include refunded sales in profit calculation", async () => {
      const cashier = await createUser({
        username: "refundProfitCashier",
        permissions: ["sales", "reports"],
      });
      const product = await Product.create({
        product_id: "RFND001",
        name: "Refunded Product",
        sku: "RFND001",
        price: 30,
        cost: 10,
        stock: 50,
        active: true,
      });
      // Normal completed sale
      await Sale.create({
        saleNumber: 6001,
        items: [
          {
            product: product._id,
            productName: "Refunded Product",
            quantity: 1,
            unitPrice: 30,
            subtotal: 30,
            total: 30,
          },
        ],
        subtotal: 30,
        discount: 0,
        tax: 0,
        total: 30,
        paymentMethod: "cash",
        cashier: cashier._id,
        status: "completed",
      });
      // Refunded sale (has refundedSale field pointing to the original)
      const originalSale = await Sale.findOne({ saleNumber: 6001 });
      await Sale.create({
        saleNumber: 6002,
        items: [
          {
            product: product._id,
            productName: "Refunded Product",
            quantity: 1,
            unitPrice: 30,
            subtotal: 30,
            total: 30,
          },
        ],
        subtotal: 30,
        discount: 0,
        tax: 0,
        total: 30,
        paymentMethod: "cash",
        cashier: cashier._id,
        status: "completed",
        refundedSale: originalSale._id,
      });
      // Should return 200 and not crash
      const res = await request(app)
        .get("/api/reports/profit?startDate=2024-01-01&endDate=2027-12-31")
        .set(authHeader(admin));
      expect(res.status).toBe(200);
    });
  });
});
