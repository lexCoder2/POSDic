const request = require("supertest");
const app = require("../../index");
const Category = require("../../models/Category");
const { authHeader, createAdminUser, createUser } = require("../helpers/auth");

let admin;

beforeEach(async () => {
  admin = await createAdminUser();
});

describe("Categories Routes", () => {
  describe("GET /api/categories", () => {
    it("should return all categories", async () => {
      await Category.insertMany([
        { name: "Fruits", icon: "fas fa-apple-alt", active: true },
        { name: "Dairy", icon: "fas fa-cheese", active: true },
      ]);

      const res = await request(app)
        .get("/api/categories")
        .set(authHeader(admin));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });

    it("should return 401 without auth", async () => {
      const res = await request(app).get("/api/categories");
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/categories", () => {
    it("should create a category for admin", async () => {
      const res = await request(app)
        .post("/api/categories")
        .set(authHeader(admin))
        .send({ name: "Beverages", icon: "fas fa-glass-water", active: true });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe("Beverages");
    });

    it("should return 403 for cashier without inventory permission", async () => {
      const cashier = await createUser({
        username: "cashier4",
        permissions: ["sales"],
      });

      const res = await request(app)
        .post("/api/categories")
        .set(authHeader(cashier))
        .send({ name: "Snacks", icon: "fas fa-cookie" });

      expect(res.status).toBe(403);
    });
  });

  describe("PUT /api/categories/:id", () => {
    it("should update a category", async () => {
      const cat = await Category.create({ name: "Old Cat", active: true });

      const res = await request(app)
        .put(`/api/categories/${cat._id}`)
        .set(authHeader(admin))
        .send({ name: "Updated Cat" });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Updated Cat");
    });
  });

  describe("DELETE /api/categories/:id", () => {
    it("should delete a category", async () => {
      const cat = await Category.create({ name: "Delete Me", active: true });

      const res = await request(app)
        .delete(`/api/categories/${cat._id}`)
        .set(authHeader(admin));

      expect(res.status).toBe(200);
    });
  });
});
