const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../../index");
const User = require("../../models/User");
const { authHeader, createAdminUser } = require("../helpers/auth");

describe("Auth Routes", () => {
  describe("POST /api/auth/register", () => {
    it("should create a new user and return token", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          username: "newuser",
          password: "password123",
          email: "new@test.com",
          firstName: "New",
          lastName: "User",
          role: "cashier",
          permissions: ["sales"],
        });

      expect(res.status).toBe(201);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.username).toBe("newuser");
      expect(res.body.user.role).toBe("cashier");
    });

    it("should return 400 if user already exists", async () => {
      await User.create({
        username: "existing",
        password: "hashed",
        firstName: "Existing",
        lastName: "User",
        email: "existing@test.com",
        role: "cashier",
        permissions: ["sales"],
      });

      const res = await request(app).post("/api/auth/register").send({
        username: "existing",
        password: "password123",
        email: "existing@test.com",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/already exists/i);
    });
  });

  describe("POST /api/auth/login", () => {
    beforeEach(async () => {
      await User.create({
        username: "loginuser",
        password: "password123",
        firstName: "Login",
        lastName: "User",
        email: "loginuser@test.com",
        role: "cashier",
        permissions: ["sales"],
        active: true,
      });
    });

    it("should login with valid credentials and return token", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ username: "loginuser", password: "password123" });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.username).toBe("loginuser");
    });

    it("should return 401 with invalid password", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ username: "loginuser", password: "wrongpassword" });

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/invalid credentials/i);
    });

    it("should return 401 with non-existent username", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ username: "nobody", password: "password123" });

      expect(res.status).toBe(401);
    });

    it("should return 401 for deactivated user", async () => {
      await User.updateOne({ username: "loginuser" }, { active: false });

      const res = await request(app)
        .post("/api/auth/login")
        .send({ username: "loginuser", password: "password123" });

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/deactivated/i);
    });
  });

  describe("GET /api/auth/me", () => {
    it("should return current user with valid token", async () => {
      const user = await createAdminUser();
      const res = await request(app).get("/api/auth/me").set(authHeader(user));

      expect(res.status).toBe(200);
      expect(res.body.user.username).toBe("admin");
    });

    it("should return 401 without token", async () => {
      const res = await request(app).get("/api/auth/me");
      expect(res.status).toBe(401);
    });

    it("should return 401 with invalid token", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer invalid.token.here");
      expect(res.status).toBe(401);
    });
  });
});
