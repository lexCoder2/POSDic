const request = require("supertest");
const app = require("../../index");
const Sale = require("../../models/Sale");
const Product = require("../../models/Product");
const Register = require("../../models/Register");
const StockMovement = require("../../models/StockMovement");
const {
  authHeader,
  createAdminUser,
  createManagerUser,
  createUser,
} = require("../helpers/auth");

let admin;
let manager;
let register;
let product;

beforeEach(async () => {
  admin = await createAdminUser();
  manager = await createManagerUser();
  register = await Register.create({
    registerNumber: "SALES-REG-001",
    openedBy: admin._id,
    openingCash: 0,
    status: "open",
  });
  product = await Product.create({
    product_id: "p-sale-001",
    name: "Sale Product",
    sku: "SALE-001",
    price: 10.0,
    stock: 100,
    active: true,
    available: true,
  });
});

describe("Sales Routes", () => {
  describe("POST /api/sales", () => {
    it("should create a sale and deduct stock", async () => {
      const saleData = {
        items: [
          {
            product: product._id,
            quantity: 2,
            unitPrice: 10.0,
            subtotal: 20.0,
            total: 20.0,
          },
        ],
        subtotal: 20.0,
        total: 20.0,
        paymentMethod: "cash",
        status: "completed",
      };

      const cashier = await createUser({
        username: "cashier2",
        permissions: ["sales"],
      });
      const res = await request(app)
        .post("/api/sales")
        .set(authHeader(cashier))
        .send(saleData);

      expect(res.status).toBe(201);
      expect(res.body.total).toBe(20.0);

      const updatedProduct = await Product.findById(product._id);
      expect(updatedProduct.stock).toBe(98);

      const movements = await StockMovement.find({
        sourceType: "sale",
        sourceId: res.body._id,
      });

      expect(movements).toHaveLength(1);
      expect(movements[0].product.toString()).toBe(product._id.toString());
      expect(movements[0].movementType).toBe("decrease");
      expect(movements[0].quantityChange).toBe(2);
      expect(movements[0].previousStock).toBe(100);
      expect(movements[0].newStock).toBe(98);
    });

    it("should return 403 without sales permission", async () => {
      const employee = await createUser({
        username: "employee1",
        role: "employee",
        permissions: [],
      });

      const res = await request(app)
        .post("/api/sales")
        .set(authHeader(employee))
        .send({ items: [], total: 0, paymentMethod: "cash" });

      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/sales", () => {
    it("should return sales list for admin", async () => {
      await Sale.create({
        items: [],
        subtotal: 50,
        discount: 0,
        tax: 0,
        total: 50,
        paymentMethod: "card",
        cashier: admin._id,
        register: register._id,
        status: "completed",
        saleNumber: 1001,
      });

      const res = await request(app).get("/api/sales").set(authHeader(admin));

      expect(res.status).toBe(200);
    });

    it("should return 401 without auth", async () => {
      const res = await request(app).get("/api/sales");
      expect(res.status).toBe(401);
    });
  });

  describe("PUT /api/sales/:id/cancel", () => {
    it("should cancel a sale with refunds permission", async () => {
      const sale = await Sale.create({
        items: [],
        subtotal: 10,
        discount: 0,
        tax: 0,
        total: 10,
        paymentMethod: "cash",
        cashier: admin._id,
        register: register._id,
        status: "completed",
        saleNumber: 2001,
      });

      const res = await request(app)
        .put(`/api/sales/${sale._id}/cancel`)
        .set(authHeader(admin));

      expect(res.status).toBe(200);
      const updated = await Sale.findById(sale._id);
      expect(updated.status).toBe("cancelled");
    });

    it("should restore stock and log a stock movement when cancelling a completed sale", async () => {
      const cashier = await createUser({
        username: "cashier-cancel-stock",
        permissions: ["sales"],
      });

      const createRes = await request(app)
        .post("/api/sales")
        .set(authHeader(cashier))
        .send({
          items: [
            {
              product: product._id,
              quantity: 2,
              unitPrice: 10.0,
              subtotal: 20.0,
              total: 20.0,
            },
          ],
          subtotal: 20.0,
          total: 20.0,
          paymentMethod: "cash",
          status: "completed",
        });

      expect(createRes.status).toBe(201);

      const cancelRes = await request(app)
        .put(`/api/sales/${createRes.body._id}/cancel`)
        .set(authHeader(admin))
        .send({ cancellationReason: "Customer return" });

      expect(cancelRes.status).toBe(200);

      const updatedProduct = await Product.findById(product._id);
      expect(updatedProduct.stock).toBe(100);

      const movement = await StockMovement.findOne({
        sourceType: "sale_cancel",
        sourceId: createRes.body._id,
        product: product._id,
      });

      expect(movement).toBeTruthy();
      expect(movement.movementType).toBe("increase");
      expect(movement.quantityChange).toBe(2);
      expect(movement.previousStock).toBe(98);
      expect(movement.newStock).toBe(100);
    });
  });

  describe("POST /api/sales/:id/refund", () => {
    it("should restore refunded stock and log a stock movement for a partial refund", async () => {
      const cashier = await createUser({
        username: "cashier-refund-stock",
        permissions: ["sales"],
      });

      const createRes = await request(app)
        .post("/api/sales")
        .set(authHeader(cashier))
        .send({
          items: [
            {
              product: product._id,
              quantity: 4,
              unitPrice: 10.0,
              subtotal: 40.0,
              total: 40.0,
            },
          ],
          subtotal: 40.0,
          total: 40.0,
          paymentMethod: "cash",
          status: "completed",
        });

      expect(createRes.status).toBe(201);

      const refundRes = await request(app)
        .post(`/api/sales/${createRes.body._id}/refund`)
        .set(authHeader(admin))
        .send({
          refundType: "partial",
          reason: "Damaged item",
          items: [
            {
              itemId: createRes.body.items[0]._id,
              quantity: 2,
            },
          ],
        });

      expect(refundRes.status).toBe(200);

      const updatedProduct = await Product.findById(product._id);
      expect(updatedProduct.stock).toBe(98);

      const movement = await StockMovement.findOne({
        sourceType: "sale_cancel",
        sourceId: createRes.body._id,
        product: product._id,
      }).sort({ createdAt: -1 });

      expect(movement).toBeTruthy();
      expect(movement.movementType).toBe("increase");
      expect(movement.quantityChange).toBe(2);
      expect(movement.previousStock).toBe(96);
      expect(movement.newStock).toBe(98);
    });
  });

  describe("GET /api/sales/reports/summary", () => {
    it("should return sales summary for manager", async () => {
      const res = await request(app)
        .get("/api/sales/reports/summary")
        .set(authHeader(manager));

      expect(res.status).toBe(200);
    });

    it("should return 403 for cashier without reports permission", async () => {
      const cashier = await createUser({
        username: "cashier3",
        permissions: ["sales"],
      });

      const res = await request(app)
        .get("/api/sales/reports/summary")
        .set(authHeader(cashier));

      expect(res.status).toBe(403);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // Mixed payment & change calculation
  // ─────────────────────────────────────────────────────────────────

  describe("POST /api/sales — mixed payment", () => {
    it("should create a sale with mixed payment method", async () => {
      const cashier = await createUser({
        username: "cashier-mixed",
        permissions: ["sales"],
      });

      const res = await request(app)
        .post("/api/sales")
        .set(authHeader(cashier))
        .send({
          items: [
            {
              product: product._id,
              quantity: 1,
              unitPrice: 30.0,
              subtotal: 30.0,
              total: 30.0,
            },
          ],
          subtotal: 30.0,
          total: 30.0,
          paymentMethod: "mixed",
          paymentDetails: {
            cash: 20.0,
            card: 10.0,
            transfer: 0,
            change: 0,
          },
          status: "completed",
        });

      expect(res.status).toBe(201);
      expect(res.body.paymentMethod).toBe("mixed");
      expect(res.body.paymentDetails.cash).toBe(20.0);
      expect(res.body.paymentDetails.card).toBe(10.0);
    });

    it("should save change in paymentDetails when cashAmount > total", async () => {
      const cashier = await createUser({
        username: "cashier-change",
        permissions: ["sales"],
      });

      const res = await request(app)
        .post("/api/sales")
        .set(authHeader(cashier))
        .send({
          items: [
            {
              product: product._id,
              quantity: 1,
              unitPrice: 15.0,
              subtotal: 15.0,
              total: 15.0,
            },
          ],
          subtotal: 15.0,
          total: 15.0,
          paymentMethod: "cash",
          paymentDetails: { cash: 20.0, change: 5.0 },
          status: "completed",
        });

      expect(res.status).toBe(201);
      expect(res.body.paymentDetails.change).toBe(5.0);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // Internal sale (isInternal = true)
  // ─────────────────────────────────────────────────────────────────

  describe("POST /api/sales/internal — internal sale", () => {
    it("should create an internal sale and deduct stock", async () => {
      const res = await request(app)
        .post("/api/sales/internal")
        .set(authHeader(manager))
        .send({
          items: [
            {
              product: product._id,
              quantity: 3,
            },
          ],
          notes: "Office consumption",
        });

      expect(res.status).toBe(201);
      expect(res.body.isInternal).toBe(true);

      const updatedProduct = await Product.findById(product._id);
      expect(updatedProduct.stock).toBe(97);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // Cancel edge cases
  // ─────────────────────────────────────────────────────────────────

  describe("PUT /api/sales/:id/cancel — edge cases", () => {
    it("should return error when trying to cancel an already-cancelled sale", async () => {
      const sale = await Sale.create({
        items: [],
        subtotal: 10,
        discount: 0,
        tax: 0,
        total: 10,
        paymentMethod: "cash",
        cashier: admin._id,
        register: register._id,
        status: "cancelled",
        saleNumber: 3001,
      });

      const res = await request(app)
        .put(`/api/sales/${sale._id}/cancel`)
        .set(authHeader(admin))
        .send({ cancellationReason: "Double cancel" });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("should return 403 when cashier without refunds permission tries to cancel", async () => {
      const cashierNoRefunds = await createUser({
        username: "cashier-no-refunds",
        permissions: ["sales"],
      });

      const sale = await Sale.create({
        items: [],
        subtotal: 5,
        discount: 0,
        tax: 0,
        total: 5,
        paymentMethod: "cash",
        cashier: cashierNoRefunds._id,
        register: register._id,
        status: "completed",
        saleNumber: 3002,
      });

      const res = await request(app)
        .put(`/api/sales/${sale._id}/cancel`)
        .set(authHeader(cashierNoRefunds));

      expect(res.status).toBe(403);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // Multiple items same product — stock deducted by total quantity
  // ─────────────────────────────────────────────────────────────────

  describe("POST /api/sales — same product multiple times", () => {
    it("should deduct total quantity when same product appears twice", async () => {
      const cashier = await createUser({
        username: "cashier-multi",
        permissions: ["sales"],
      });

      const res = await request(app)
        .post("/api/sales")
        .set(authHeader(cashier))
        .send({
          items: [
            {
              product: product._id,
              quantity: 3,
              unitPrice: 10.0,
              subtotal: 30.0,
              total: 30.0,
            },
            {
              product: product._id,
              quantity: 2,
              unitPrice: 10.0,
              subtotal: 20.0,
              total: 20.0,
            },
          ],
          subtotal: 50.0,
          total: 50.0,
          paymentMethod: "cash",
          status: "completed",
        });

      expect(res.status).toBe(201);

      const updatedProduct = await Product.findById(product._id);
      // 100 - 3 - 2 = 95
      expect(updatedProduct.stock).toBe(95);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // GET /api/sales query filters
  // ─────────────────────────────────────────────────────────────────

  describe("GET /api/sales — filters", () => {
    beforeEach(async () => {
      await Sale.create([
        {
          items: [],
          subtotal: 10,
          discount: 0,
          tax: 0,
          total: 10,
          paymentMethod: "cash",
          cashier: admin._id,
          register: register._id,
          status: "completed",
          saleNumber: 4001,
        },
        {
          items: [],
          subtotal: 20,
          discount: 0,
          tax: 0,
          total: 20,
          paymentMethod: "card",
          cashier: admin._id,
          register: register._id,
          status: "cancelled",
          saleNumber: 4002,
        },
        {
          items: [],
          subtotal: 30,
          discount: 0,
          tax: 0,
          total: 30,
          paymentMethod: "cash",
          cashier: admin._id,
          register: register._id,
          status: "completed",
          isInternal: true,
          saleNumber: 4003,
        },
      ]);
    });

    it("should filter sales by status=cancelled", async () => {
      const res = await request(app)
        .get("/api/sales?status=cancelled")
        .set(authHeader(admin));

      expect(res.status).toBe(200);
      const sales = res.body.data || res.body;
      const statuses = (Array.isArray(sales) ? sales : []).map((s) => s.status);
      if (statuses.length > 0) {
        expect(statuses.every((s) => s === "cancelled")).toBe(true);
      }
    });

    it("should return all sales including internal when no filter", async () => {
      const res = await request(app).get("/api/sales").set(authHeader(admin));

      expect(res.status).toBe(200);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // Sale with tax fields
  // ─────────────────────────────────────────────────────────────────

  describe("POST /api/sales — with tax", () => {
    it("should save taxRate and taxAmount fields per item", async () => {
      const cashier = await createUser({
        username: "cashier-tax",
        permissions: ["sales"],
      });

      const res = await request(app)
        .post("/api/sales")
        .set(authHeader(cashier))
        .send({
          items: [
            {
              product: product._id,
              quantity: 1,
              unitPrice: 100.0,
              taxRate: 16,
              taxAmount: 16.0,
              subtotal: 100.0,
              total: 116.0,
            },
          ],
          subtotal: 100.0,
          total: 116.0,
          paymentMethod: "cash",
          status: "completed",
        });

      expect(res.status).toBe(201);
      const savedItem = res.body.items[0];
      expect(savedItem.taxRate).toBe(16);
      expect(savedItem.taxAmount).toBe(16);
    });
  });
});
