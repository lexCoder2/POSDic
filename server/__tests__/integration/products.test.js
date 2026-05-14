const request = require("supertest");
const app = require("../../index");
const Product = require("../../models/Product");
const { authHeader, createAdminUser, createUser } = require("../helpers/auth");

let admin;

beforeEach(async () => {
  admin = await createAdminUser();
});

describe("Products Routes", () => {
  describe("GET /api/products", () => {
    it("should return paginated products", async () => {
      await Product.insertMany([
        {
          product_id: "p-apl-001",
          name: "Apple",
          sku: "APL-001",
          price: 1.5,
          stock: 100,
          active: true,
          available: true,
        },
        {
          product_id: "p-ban-001",
          name: "Banana",
          sku: "BAN-001",
          price: 0.75,
          stock: 200,
          active: true,
          available: true,
        },
      ]);

      const res = await request(app)
        .get("/api/products")
        .set(authHeader(admin));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data || res.body)).toBe(true);
    });

    it("should return 401 without auth", async () => {
      const res = await request(app).get("/api/products");
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/products/barcode/:barcode", () => {
    it("should return product by barcode", async () => {
      await Product.create({
        product_id: "p-test-001",
        name: "Test Product",
        sku: "TEST-001",
        ean: "1234567890",
        price: 9.99,
        stock: 50,
        active: true,
        available: true,
      });

      const res = await request(app)
        .get("/api/products/barcode/1234567890")
        .set(authHeader(admin));

      expect(res.status).toBe(200);
      expect(res.body.ean).toBe("1234567890");
      expect(res.body.name).toBe("Test Product");
    });

    it("should return 404 for unknown barcode", async () => {
      const res = await request(app)
        .get("/api/products/barcode/9999999999")
        .set(authHeader(admin));

      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/products", () => {
    it("should create a product with valid data", async () => {
      const res = await request(app)
        .post("/api/products")
        .set(authHeader(admin))
        .send({
          product_id: "p-new-001",
          name: "New Product",
          sku: "NEW-001",
          price: 5.99,
          stock: 30,
          active: true,
          available: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe("New Product");
      expect(res.body.sku).toBe("NEW-001");
    });

    it("should generate product_id when the inventory form does not send one", async () => {
      const res = await request(app)
        .post("/api/products")
        .set(authHeader(admin))
        .send({
          name: "Generated Id Product",
          ean: "9000000012345",
          price: 5.99,
          stock: 30,
          active: true,
          available: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.product_id).toMatch(/^INV-/);
    });

    it("should return 400 when required fields are missing", async () => {
      const res = await request(app)
        .post("/api/products")
        .set(authHeader(admin))
        .send({
          price: 5.99,
          stock: 30,
          active: true,
          available: true,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBeTruthy();
    });

    it("should return 403 for cashier without inventory permission", async () => {
      const cashier = await createUser({
        username: "cashier1",
        permissions: ["sales"],
      });

      const res = await request(app)
        .post("/api/products")
        .set(authHeader(cashier))
        .send({ name: "Product", sku: "SKU-001", price: 1.0, stock: 10 });

      expect(res.status).toBe(403);
    });
  });

  describe("PUT /api/products/:id", () => {
    it("should update a product", async () => {
      const product = await Product.create({
        product_id: "p-upd-001",
        name: "Old Name",
        sku: "UPD-001",
        price: 3.0,
        stock: 10,
        active: true,
        available: true,
      });

      const res = await request(app)
        .put(`/api/products/${product._id}`)
        .set(authHeader(admin))
        .send({ name: "New Name", price: 4.0 });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe("New Name");
    });
  });

  describe("DELETE /api/products/:id", () => {
    it("should delete a product", async () => {
      const product = await Product.create({
        product_id: "p-del-001",
        name: "To Delete",
        sku: "DEL-001",
        price: 1.0,
        stock: 0,
        active: true,
        available: true,
      });

      const res = await request(app)
        .delete(`/api/products/${product._id}`)
        .set(authHeader(admin));

      expect(res.status).toBe(200);
      const found = await Product.findById(product._id);
      expect(found).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // incompleteInfo flag
  // ─────────────────────────────────────────────────────────────────

  describe("POST /api/products — incompleteInfo flag", () => {
    it("should create a product with incompleteInfo=true (quick create)", async () => {
      const res = await request(app)
        .post("/api/products")
        .set(authHeader(admin))
        .send({
          product_id: "p-quick-001",
          name: "Quick Product",
          price: 4.99,
          ean: "9000000001",
          incompleteInfo: true,
          active: true,
          available: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.incompleteInfo).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // product_id uniqueness conflict
  // ─────────────────────────────────────────────────────────────────

  describe("POST /api/products — duplicate product_id conflict", () => {
    it("should return 400 when product_id is already used", async () => {
      await Product.create({
        product_id: "p-dup-id-001",
        name: "Product A",
        ean: "1111111110",
        price: 1.0,
        active: true,
        available: true,
      });

      const res = await request(app)
        .post("/api/products")
        .set(authHeader(admin))
        .send({
          product_id: "p-dup-id-001", // same product_id as above
          name: "Product B Duplicate ID",
          ean: "1111111119",
          price: 2.0,
          active: true,
          available: true,
        });

      expect(res.status).toBe(400);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // Barcode lookup for unavailable product
  // ─────────────────────────────────────────────────────────────────

  describe("GET /api/products/barcode/:barcode — unavailable product", () => {
    it("should return 404 when product is not available", async () => {
      await Product.create({
        product_id: "p-unavail-001",
        name: "Hidden Product",
        ean: "5555555555",
        price: 9.99,
        stock: 10,
        active: true,
        available: false,
      });

      const res = await request(app)
        .get("/api/products/barcode/5555555555")
        .set(authHeader(admin));

      expect(res.status).toBe(404);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // POST /api/products/generate-ean
  // ─────────────────────────────────────────────────────────────────

  describe("POST /api/products/generate-ean", () => {
    it("should generate a unique EAN starting with 9", async () => {
      const res = await request(app)
        .post("/api/products/generate-ean")
        .set(authHeader(admin));

      expect(res.status).toBe(200);
      expect(res.body.ean).toBeDefined();
      expect(String(res.body.ean).startsWith("9")).toBe(true);
    });

    it("should return 401 without auth", async () => {
      const res = await request(app).post("/api/products/generate-ean");
      expect(res.status).toBe(401);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // GET /api/products/search — fuzzy search
  // ─────────────────────────────────────────────────────────────────

  describe("GET /api/products/search — fuzzy search", () => {
    beforeEach(async () => {
      await Product.create([
        {
          product_id: "p-apple-001",
          name: "Apple Red",
          price: 1.5,
          active: true,
          available: true,
        },
        {
          product_id: "p-banana-001",
          name: "Banana",
          price: 0.75,
          active: true,
          available: true,
        },
      ]);
    });

    it("should return results for exact match", async () => {
      const res = await request(app)
        .get("/api/products/search?q=Apple")
        .set(authHeader(admin));

      expect(res.status).toBe(200);
      const results = Array.isArray(res.body) ? res.body : res.body.data || [];
      expect(results.length).toBeGreaterThan(0);
    });

    it("should return results for partial match", async () => {
      const res = await request(app)
        .get("/api/products/search?q=Banan")
        .set(authHeader(admin));

      expect(res.status).toBe(200);
    });

    it("should return 401 without auth", async () => {
      const res = await request(app).get("/api/products/search?q=apple");
      expect(res.status).toBe(401);
    });
  });
});
