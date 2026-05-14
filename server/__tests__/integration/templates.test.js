const request = require("supertest");
const app = require("../../index");
const PrintTemplate = require("../../models/PrintTemplate");
const { authHeader, createAdminUser, createUser } = require("../helpers/auth");

let admin;

const templatePayload = {
  name: "Test Receipt Template",
  description: "A test template",
  templateType: "receipt",
  paperSize: "80mm",
};

beforeEach(async () => {
  admin = await createAdminUser();
});

describe("Templates Routes", () => {
  describe("GET /api/templates", () => {
    it("should return 401 without auth", async () => {
      const res = await request(app).get("/api/templates");
      expect(res.status).toBe(401);
    });

    it("should return list of templates for authenticated user", async () => {
      await PrintTemplate.create(templatePayload);
      const res = await request(app)
        .get("/api/templates")
        .set(authHeader(admin));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("GET /api/templates/default", () => {
    it("should return 404 when no default template exists", async () => {
      const res = await request(app)
        .get("/api/templates/default")
        .set(authHeader(admin));
      expect(res.status).toBe(404);
    });

    it("should return default template when it exists", async () => {
      await PrintTemplate.create({
        ...templatePayload,
        name: "Default",
        isDefault: true,
        active: true,
      });
      const res = await request(app)
        .get("/api/templates/default")
        .set(authHeader(admin));
      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Default");
    });
  });

  describe("POST /api/templates", () => {
    it("should return 401 without auth", async () => {
      const res = await request(app)
        .post("/api/templates")
        .send(templatePayload);
      expect(res.status).toBe(401);
    });

    it("should return 403 for user without settings permission", async () => {
      const cashier = await createUser({
        username: "noSettingsCashier",
        permissions: ["sales"],
      });
      const res = await request(app)
        .post("/api/templates")
        .set(authHeader(cashier))
        .send(templatePayload);
      expect(res.status).toBe(403);
    });

    it("should create template for admin with settings permission", async () => {
      const res = await request(app)
        .post("/api/templates")
        .set(authHeader(admin))
        .send(templatePayload);
      expect(res.status).toBe(201);
      expect(res.body.name).toBe(templatePayload.name);
    });

    it("should return 400 for duplicate template name", async () => {
      await PrintTemplate.create(templatePayload);
      const res = await request(app)
        .post("/api/templates")
        .set(authHeader(admin))
        .send(templatePayload);
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/templates/:id", () => {
    it("should return 404 for non-existent template", async () => {
      const res = await request(app)
        .get("/api/templates/000000000000000000000001")
        .set(authHeader(admin));
      expect(res.status).toBe(404);
    });

    it("should return template by id", async () => {
      const template = await PrintTemplate.create(templatePayload);
      const res = await request(app)
        .get(`/api/templates/${template._id}`)
        .set(authHeader(admin));
      expect(res.status).toBe(200);
      expect(res.body.name).toBe(templatePayload.name);
    });
  });
});
