const request = require("supertest");
const app = require("../../index");
const Provider = require("../../models/Provider");
const { authHeader, createAdminUser, createUser } = require("../helpers/auth");

let admin;

const providerPayload = {
  code: "ACME01",
  name: "ACME Corp",
  contactName: "John Doe",
  email: "john@acme.com",
  phone: "555-1234",
};

beforeEach(async () => {
  admin = await createAdminUser();
});

describe("Providers Routes", () => {
  describe("GET /api/providers", () => {
    it("should return 401 without auth", async () => {
      const res = await request(app).get("/api/providers");
      expect(res.status).toBe(401);
    });

    it("should return paginated providers for authenticated user", async () => {
      await Provider.create(providerPayload);
      const res = await request(app)
        .get("/api/providers")
        .set(authHeader(admin));
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("data");
      expect(res.body).toHaveProperty("pagination");
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("should filter providers by search term", async () => {
      await Provider.create(providerPayload);
      await Provider.create({ code: "OTH01", name: "Other Company" });

      const res = await request(app)
        .get("/api/providers?search=acme")
        .set(authHeader(admin));
      expect(res.status).toBe(200);
      expect(res.body.data.some((p) => p.name === "ACME Corp")).toBe(true);
    });
  });

  describe("GET /api/providers/:id", () => {
    it("should return 401 without auth", async () => {
      const res = await request(app).get(
        "/api/providers/000000000000000000000001"
      );
      expect(res.status).toBe(401);
    });

    it("should return 404 for non-existent provider", async () => {
      const res = await request(app)
        .get("/api/providers/000000000000000000000001")
        .set(authHeader(admin));
      expect(res.status).toBe(404);
    });

    it("should return provider by id", async () => {
      const provider = await Provider.create(providerPayload);
      const res = await request(app)
        .get(`/api/providers/${provider._id}`)
        .set(authHeader(admin));
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(providerPayload.code);
    });
  });

  describe("POST /api/providers", () => {
    it("should return 401 without auth", async () => {
      const res = await request(app)
        .post("/api/providers")
        .send(providerPayload);
      expect(res.status).toBe(401);
    });

    it("should return 403 for user without inventory permission", async () => {
      const cashier = await createUser({
        username: "noinventoryCashier",
        permissions: ["sales"],
      });
      const res = await request(app)
        .post("/api/providers")
        .set(authHeader(cashier))
        .send(providerPayload);
      expect(res.status).toBe(403);
    });

    it("should create provider for admin", async () => {
      const res = await request(app)
        .post("/api/providers")
        .set(authHeader(admin))
        .send(providerPayload);
      expect(res.status).toBe(201);
      expect(res.body.code).toBe(providerPayload.code);
      expect(res.body.name).toBe(providerPayload.name);
    });

    it("should return 400 for duplicate code", async () => {
      await Provider.create(providerPayload);
      const res = await request(app)
        .post("/api/providers")
        .set(authHeader(admin))
        .send(providerPayload);
      expect(res.status).toBe(400);
    });
  });

  describe("PUT /api/providers/:id", () => {
    it("should update provider for admin", async () => {
      const provider = await Provider.create(providerPayload);
      const res = await request(app)
        .put(`/api/providers/${provider._id}`)
        .set(authHeader(admin))
        .send({ name: "ACME Updated" });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe("ACME Updated");
    });

    it("should return 404 for non-existent provider", async () => {
      const res = await request(app)
        .put("/api/providers/000000000000000000000001")
        .set(authHeader(admin))
        .send({ name: "X" });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/providers/:id", () => {
    it("should delete provider for admin", async () => {
      const provider = await Provider.create(providerPayload);
      const res = await request(app)
        .delete(`/api/providers/${provider._id}`)
        .set(authHeader(admin));
      expect([200, 204]).toContain(res.status);
    });

    it("should return 401 without auth", async () => {
      const res = await request(app).delete(
        "/api/providers/000000000000000000000001"
      );
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/providers/code/:code", () => {
    it("should return 404 for non-existent code", async () => {
      const res = await request(app)
        .get("/api/providers/code/NOTEXIST")
        .set(authHeader(admin));
      expect(res.status).toBe(404);
    });

    it("should return provider by code", async () => {
      await Provider.create(providerPayload);
      const res = await request(app)
        .get(`/api/providers/code/${providerPayload.code}`)
        .set(authHeader(admin));
      expect(res.status).toBe(200);
      expect(res.body.name).toBe(providerPayload.name);
    });
  });
});
