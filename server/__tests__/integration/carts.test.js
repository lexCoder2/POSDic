const request = require("supertest");
const app = require("../../index");
const Cart = require("../../models/Cart");
const Product = require("../../models/Product");
const { authHeader, createAdminUser, createUser } = require("../helpers/auth");

let cashier;
let product;

beforeEach(async () => {
  cashier = await createUser({
    username: "cart_cashier",
    permissions: ["sales"],
  });
  product = await Product.create({
    product_id: "p-cart-001",
    name: "Cart Product",
    sku: "CART-001",
    price: 5.0,
    stock: 50,
    active: true,
    available: true,
  });
});

describe("Carts Routes", () => {
  describe("GET /api/carts", () => {
    it("should return carts list", async () => {
      const res = await request(app).get("/api/carts").set(authHeader(cashier));

      expect(res.status).toBe(200);
    });

    it("should return 401 without auth", async () => {
      const res = await request(app).get("/api/carts");
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/carts", () => {
    it("should create a cart", async () => {
      const res = await request(app)
        .post("/api/carts")
        .set(authHeader(cashier))
        .send({
          cashier: cashier._id,
          subtotal: 0,
          total: 0,
          items: [],
        });

      expect(res.status).toBe(201);
      expect(res.body.cashier).toBeDefined();
    });

    it("should return 401 without auth", async () => {
      const res = await request(app)
        .post("/api/carts")
        .send({ cashier: cashier._id, subtotal: 0, total: 0, items: [] });

      expect(res.status).toBe(401);
    });
  });

  describe("PUT /api/carts/:id", () => {
    it("should update a cart", async () => {
      const cart = await Cart.create({
        cashier: cashier._id,
        subtotal: 0,
        total: 0,
        items: [],
      });

      const res = await request(app)
        .put(`/api/carts/${cart._id}`)
        .set(authHeader(cashier))
        .send({ subtotal: 5.0, total: 5.0 });

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(5.0);
    });
  });

  describe("DELETE /api/carts/:id", () => {
    it("should delete a cart", async () => {
      const cart = await Cart.create({
        cashier: cashier._id,
        subtotal: 0,
        total: 0,
        items: [],
      });

      const res = await request(app)
        .delete(`/api/carts/${cart._id}`)
        .set(authHeader(cashier));

      expect(res.status).toBe(200);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // Manual-only items (no product ObjectId)
  // ─────────────────────────────────────────────────────────────────

  describe("POST /api/carts — manual items", () => {
    it("should create a cart with only manual items (no product reference)", async () => {
      const res = await request(app)
        .post("/api/carts")
        .set(authHeader(cashier))
        .send({
          cashier: cashier._id,
          items: [
            {
              description: "Loose cheese by weight",
              quantity: 1,
              price: 8.0,
              subtotal: 8.0,
            },
          ],
          subtotal: 8.0,
          total: 8.0,
        });

      expect(res.status).toBe(201);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].description).toBe("Loose cheese by weight");
    });

    it("should create a cart with mixed product and manual items", async () => {
      const res = await request(app)
        .post("/api/carts")
        .set(authHeader(cashier))
        .send({
          cashier: cashier._id,
          items: [
            {
              product: product._id,
              quantity: 2,
              price: 5.0,
              subtotal: 10.0,
            },
            {
              description: "Bulk nuts",
              quantity: 1,
              price: 3.0,
              subtotal: 3.0,
            },
          ],
          subtotal: 13.0,
          total: 13.0,
        });

      expect(res.status).toBe(201);
      expect(res.body.items).toHaveLength(2);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // GET /api/carts/active/:cashierId
  // ─────────────────────────────────────────────────────────────────

  describe("GET /api/carts/active/:cashierId", () => {
    it("should return the active cart for a cashier", async () => {
      await Cart.create({
        cashier: cashier._id,
        subtotal: 5,
        total: 5,
        items: [
          { description: "Item", quantity: 1, price: 5.0, subtotal: 5.0 },
        ],
        status: "active",
      });

      const res = await request(app)
        .get(`/api/carts/active/${cashier._id}`)
        .set(authHeader(cashier));

      expect(res.status).toBe(200);
    });

    it("should return 401 without auth", async () => {
      const res = await request(app).get(`/api/carts/active/${cashier._id}`);
      expect(res.status).toBe(401);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // PUT /api/carts/:id/complete
  // ─────────────────────────────────────────────────────────────────

  describe("PUT /api/carts/:id/complete", () => {
    it("should mark an active cart as completed", async () => {
      const cart = await Cart.create({
        cashier: cashier._id,
        subtotal: 10,
        total: 10,
        items: [],
        status: "active",
      });

      const res = await request(app)
        .put(`/api/carts/${cart._id}/complete`)
        .set(authHeader(cashier));

      expect(res.status).toBe(200);
      const updated = await Cart.findById(cart._id);
      expect(updated.status).toBe("completed");
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // PUT /api/carts/:id/abandon — public endpoint (no auth, sendBeacon)
  // ─────────────────────────────────────────────────────────────────

  describe("PUT /api/carts/:id/abandon", () => {
    it("should mark cart as abandoned without auth token", async () => {
      const cart = await Cart.create({
        cashier: cashier._id,
        subtotal: 0,
        total: 0,
        items: [],
        status: "active",
      });

      const res = await request(app).put(`/api/carts/${cart._id}/abandon`);

      expect(res.status).toBe(200);
      const updated = await Cart.findById(cart._id);
      expect(updated.status).toBe("abandoned");
    });
  });
});
