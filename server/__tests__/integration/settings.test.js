const request = require("supertest");
const app = require("../../index");
const {
  authHeader,
  createAdminUser,
  createManagerUser,
  createUser,
} = require("../helpers/auth");

let admin;
let manager;
let cashier;

beforeEach(async () => {
  admin = await createAdminUser();
  manager = await createManagerUser();
  cashier = await createUser({ username: "cashier1", permissions: ["sales"] });
});

describe("Settings Routes", () => {
  describe("GET /api/settings", () => {
    it("should return 401 without auth token", async () => {
      const res = await request(app).get("/api/settings");
      expect(res.status).toBe(401);
    });

    it("should return 200 with default settings for any authenticated user", async () => {
      const res = await request(app)
        .get("/api/settings")
        .set(authHeader(admin));
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("estimatedCostEnabled");
      expect(res.body).toHaveProperty("estimatedCostMarginPercent");
      expect(res.body).toHaveProperty("sellMode");
    });

    it("should allow cashier to read settings", async () => {
      const res = await request(app)
        .get("/api/settings")
        .set(authHeader(cashier));
      expect(res.status).toBe(200);
    });

    it("should return default estimatedCostEnabled = false", async () => {
      const res = await request(app)
        .get("/api/settings")
        .set(authHeader(admin));
      expect(res.body.estimatedCostEnabled).toBe(false);
    });

    it("should return default estimatedCostMarginPercent = 30", async () => {
      const res = await request(app)
        .get("/api/settings")
        .set(authHeader(admin));
      expect(res.body.estimatedCostMarginPercent).toBe(30);
    });

    it('should return default sellMode = "combined"', async () => {
      const res = await request(app)
        .get("/api/settings")
        .set(authHeader(admin));
      expect(res.body.sellMode).toBe("combined");
    });
  });

  describe("PUT /api/settings", () => {
    it("should return 401 without auth token", async () => {
      const res = await request(app)
        .put("/api/settings")
        .send({ estimatedCostEnabled: true });
      expect(res.status).toBe(401);
    });

    it("should return 403 for cashier without settings permission", async () => {
      const res = await request(app)
        .put("/api/settings")
        .set(authHeader(cashier))
        .send({ estimatedCostEnabled: true });
      expect(res.status).toBe(403);
    });

    it("should allow admin to update settings", async () => {
      const res = await request(app)
        .put("/api/settings")
        .set(authHeader(admin))
        .send({
          estimatedCostEnabled: true,
          estimatedCostMarginPercent: 25,
          sellMode: "split",
        });
      expect(res.status).toBe(200);
      expect(res.body.estimatedCostEnabled).toBe(true);
      expect(res.body.estimatedCostMarginPercent).toBe(25);
      expect(res.body.sellMode).toBe("split");
    });

    it("should allow manager with settings permission to update", async () => {
      const managerWithSettings = await createManagerUser({
        username: "mgr2",
        email: "mgr2@test.com",
        permissions: ["reports", "inventory", "sales", "settings"],
      });
      const res = await request(app)
        .put("/api/settings")
        .set(authHeader(managerWithSettings))
        .send({ estimatedCostMarginPercent: 40 });
      expect(res.status).toBe(200);
      expect(res.body.estimatedCostMarginPercent).toBe(40);
    });

    it("should persist changes — GET reflects updated values", async () => {
      await request(app).put("/api/settings").set(authHeader(admin)).send({
        estimatedCostEnabled: true,
        estimatedCostMarginPercent: 45,
        sellMode: "split",
      });

      const res = await request(app)
        .get("/api/settings")
        .set(authHeader(cashier));
      expect(res.body.estimatedCostEnabled).toBe(true);
      expect(res.body.estimatedCostMarginPercent).toBe(45);
      expect(res.body.sellMode).toBe("split");
    });

    it("should return 403 when manager with settings permission updates sellMode", async () => {
      const managerWithSettings = await createManagerUser({
        username: "mgr-sell-mode",
        email: "mgr-sell-mode@test.com",
        permissions: ["reports", "inventory", "sales", "settings"],
      });

      const res = await request(app)
        .put("/api/settings")
        .set(authHeader(managerWithSettings))
        .send({ sellMode: "split" });

      expect(res.status).toBe(403);
    });

    it("should return 400 for an invalid sellMode", async () => {
      const res = await request(app)
        .put("/api/settings")
        .set(authHeader(admin))
        .send({ sellMode: "invalid-mode" });

      expect(res.status).toBe(400);
    });

    it("should return 400 when marginPercent is below 0", async () => {
      const res = await request(app)
        .put("/api/settings")
        .set(authHeader(admin))
        .send({ estimatedCostMarginPercent: -5 });
      expect(res.status).toBe(400);
    });

    it("should return 400 when marginPercent exceeds 100", async () => {
      const res = await request(app)
        .put("/api/settings")
        .set(authHeader(admin))
        .send({ estimatedCostMarginPercent: 101 });
      expect(res.status).toBe(400);
    });

    it("should only update provided fields (partial update)", async () => {
      await request(app)
        .put("/api/settings")
        .set(authHeader(admin))
        .send({ estimatedCostEnabled: true, estimatedCostMarginPercent: 35 });

      const res = await request(app)
        .put("/api/settings")
        .set(authHeader(admin))
        .send({ estimatedCostMarginPercent: 20 });

      expect(res.body.estimatedCostEnabled).toBe(true);
      expect(res.body.estimatedCostMarginPercent).toBe(20);
    });
  });
});
