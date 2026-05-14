const request = require("supertest");
const app = require("../../index");
const User = require("../../models/User");
const {
  authHeader,
  createAdminUser,
  createManagerUser,
  createUser,
} = require("../helpers/auth");

let admin;

beforeEach(async () => {
  admin = await createAdminUser();
});

describe("Users Routes", () => {
  describe("GET /api/users", () => {
    it("should return all users for admin", async () => {
      await createUser({ username: "u1" });
      await createUser({ username: "u2" });

      const res = await request(app).get("/api/users").set(authHeader(admin));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data || res.body)).toBe(true);
    });

    it("should return 403 for cashier without users permission", async () => {
      const cashier = await createUser({
        username: "csh5",
        permissions: ["sales"],
      });

      const res = await request(app).get("/api/users").set(authHeader(cashier));

      expect(res.status).toBe(403);
    });

    it("should return 401 without auth", async () => {
      const res = await request(app).get("/api/users");
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/users", () => {
    it("should create user via register endpoint for admin", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          username: "newcashier",
          password: "password123",
          firstName: "New",
          lastName: "Cashier",
          email: "newcashier@test.com",
          role: "cashier",
          permissions: ["sales"],
        });

      expect(res.status).toBe(201);
      expect(res.body.user.username).toBe("newcashier");
    });

    it("should return 400 if username already exists", async () => {
      await createUser({ username: "duplicate" });

      const res = await request(app)
        .post("/api/auth/register")
        .send({
          username: "duplicate",
          password: "password123",
          firstName: "Dup",
          lastName: "User",
          email: "dup@test.com",
          role: "cashier",
          permissions: ["sales"],
        });

      expect(res.status).toBe(400);
    });
  });

  describe("PUT /api/users/:id", () => {
    it("should update user firstName", async () => {
      const user = await createUser({ username: "editme" });

      const res = await request(app)
        .put(`/api/users/${user._id}`)
        .set(authHeader(admin))
        .send({ firstName: "Updated" });

      expect(res.status).toBe(200);
      expect(res.body.firstName).toBe("Updated");
    });
  });

  describe("DELETE /api/users/:id", () => {
    it("should delete (deactivate) a user", async () => {
      const user = await createUser({ username: "deactivate_me" });

      const res = await request(app)
        .delete(`/api/users/${user._id}`)
        .set(authHeader(admin));

      expect(res.status).toBe(200);
    });
  });
});
