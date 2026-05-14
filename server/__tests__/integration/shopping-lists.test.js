require("..//helpers/setup");
const request = require("supertest");
const app = require("../../index");
const ShoppingList = require("../../models/ShoppingList");
const { authHeader, createAdminUser, createUser } = require("../helpers/auth");

let admin;
let manager;

beforeEach(async () => {
  admin = await createAdminUser();
  manager = await createUser({
    username: "manager1",
    role: "manager",
    permissions: ["inventory", "reports"],
  });
});

const sampleItems = [
  { productName: "Milk", quantity: 2 },
  { productName: "Bread", quantity: 1 },
];

describe("Shopping Lists API — Spec 9", () => {
  // ─── GET /api/shopping-lists ─────────────────────────────────────────────

  describe("GET /api/shopping-lists", () => {
    it("should return 401 without auth token", async () => {
      const res = await request(app).get("/api/shopping-lists");
      expect(res.status).toBe(401);
    });

    it("should return 200 with empty array when no lists exist", async () => {
      const res = await request(app)
        .get("/api/shopping-lists")
        .set(authHeader(admin));
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("lists");
      expect(Array.isArray(res.body.lists)).toBe(true);
    });

    it("should return existing shopping lists", async () => {
      await ShoppingList.create({
        name: "Weekly Shop",
        items: sampleItems,
        createdBy: admin._id,
      });
      const res = await request(app)
        .get("/api/shopping-lists")
        .set(authHeader(admin));
      expect(res.status).toBe(200);
      expect(res.body.lists).toHaveLength(1);
      expect(res.body.lists[0].name).toBe("Weekly Shop");
    });
  });

  // ─── POST /api/shopping-lists ─────────────────────────────────────────────

  describe("POST /api/shopping-lists", () => {
    it("should return 401 without auth token", async () => {
      const res = await request(app)
        .post("/api/shopping-lists")
        .send({ name: "Test List" });
      expect(res.status).toBe(401);
    });

    it("should create a new shopping list", async () => {
      const res = await request(app)
        .post("/api/shopping-lists")
        .set(authHeader(admin))
        .send({ name: "New List", items: sampleItems });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("list");
      expect(res.body.list.name).toBe("New List");
      expect(res.body.list.items).toHaveLength(2);
    });

    it("should return 400 when name is missing", async () => {
      const res = await request(app)
        .post("/api/shopping-lists")
        .set(authHeader(admin))
        .send({ items: sampleItems });
      expect(res.status).toBe(400);
    });
  });

  // ─── GET /api/shopping-lists/:id ────────────────────────────────────────

  describe("GET /api/shopping-lists/:id", () => {
    it("should return 404 for non-existent list", async () => {
      const res = await request(app)
        .get("/api/shopping-lists/000000000000000000000001")
        .set(authHeader(admin));
      expect(res.status).toBe(404);
    });

    it("should return the requested list", async () => {
      const list = await ShoppingList.create({
        name: "Test",
        items: sampleItems,
        createdBy: admin._id,
      });
      const res = await request(app)
        .get(`/api/shopping-lists/${list._id}`)
        .set(authHeader(admin));
      expect(res.status).toBe(200);
      expect(res.body.list.name).toBe("Test");
    });
  });

  // ─── PUT /api/shopping-lists/:id ────────────────────────────────────────

  describe("PUT /api/shopping-lists/:id", () => {
    it("should update list name and items", async () => {
      const list = await ShoppingList.create({
        name: "Old Name",
        items: sampleItems,
        createdBy: admin._id,
      });
      const res = await request(app)
        .put(`/api/shopping-lists/${list._id}`)
        .set(authHeader(admin))
        .send({ name: "New Name" });
      expect(res.status).toBe(200);
      expect(res.body.list.name).toBe("New Name");
    });
  });

  // ─── DELETE /api/shopping-lists/:id ─────────────────────────────────────

  describe("DELETE /api/shopping-lists/:id", () => {
    it("should delete the list", async () => {
      const list = await ShoppingList.create({
        name: "To Delete",
        items: sampleItems,
        createdBy: admin._id,
      });
      const res = await request(app)
        .delete(`/api/shopping-lists/${list._id}`)
        .set(authHeader(admin));
      expect(res.status).toBe(200);
      const found = await ShoppingList.findById(list._id);
      expect(found).toBeNull();
    });
  });

  // ─── PUT /api/shopping-lists/:id/items/:itemIndex/toggle ───────────────

  describe("PUT /api/shopping-lists/:id/items/:itemIndex/toggle", () => {
    it("should toggle the purchased state of an item", async () => {
      const list = await ShoppingList.create({
        name: "Toggle Test",
        items: [{ productName: "Eggs", quantity: 12, purchased: false }],
        createdBy: admin._id,
      });
      const res = await request(app)
        .put(`/api/shopping-lists/${list._id}/items/0/toggle`)
        .set(authHeader(admin));
      expect(res.status).toBe(200);
      expect(res.body.list.items[0].purchased).toBe(true);
    });
  });

  // ─── GET /api/shopping-lists/recommendations ─────────────────────────────

  describe("GET /api/shopping-lists/recommendations", () => {
    it("should return 200 with a recommendations array", async () => {
      const res = await request(app)
        .get("/api/shopping-lists/recommendations")
        .set(authHeader(admin));
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("recommendations");
      expect(Array.isArray(res.body.recommendations)).toBe(true);
    });
  });
});
