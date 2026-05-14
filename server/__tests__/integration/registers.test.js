const request = require("supertest");
const app = require("../../index");
const Register = require("../../models/Register");
const { authHeader, createAdminUser, createUser } = require("../helpers/auth");

let admin;

beforeEach(async () => {
  admin = await createAdminUser();
});

describe("Registers Routes", () => {
  describe("GET /api/registers/available", () => {
    it("should return available registers for authenticated user", async () => {
      // Create a closed register session
      await Register.create({
        registerNumber: "REG-001",
        openedBy: admin._id,
        openingCash: 0,
        status: "closed",
        closedAt: new Date(),
      });

      const res = await request(app)
        .get("/api/registers/available")
        .set(authHeader(admin));

      expect(res.status).toBe(200);
      expect(res.body.registers).toBeDefined();
      expect(Array.isArray(res.body.registers)).toBe(true);
    });

    it("should return 401 without auth", async () => {
      const res = await request(app).get("/api/registers/available");
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/registers/active", () => {
    it("should return null when no active register", async () => {
      const res = await request(app)
        .get("/api/registers/active")
        .set(authHeader(admin));

      expect(res.status).toBe(200);
      expect(res.body).toBeNull();
    });
  });

  describe("POST /api/registers/open", () => {
    it("should open a register", async () => {
      const res = await request(app)
        .post("/api/registers/open")
        .set(authHeader(admin))
        .send({ registerNumber: "REG-001", openingCash: 100 });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe("open");
      expect(res.body.registerNumber).toBe("REG-001");
    });

    it("should return 400 if user already has an open register", async () => {
      // Open a register first
      await Register.create({
        registerNumber: "REG-OPEN",
        openedBy: admin._id,
        openingCash: 0,
        status: "open",
      });

      const res = await request(app)
        .post("/api/registers/open")
        .set(authHeader(admin))
        .send({ registerNumber: "REG-002", openingCash: 100 });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/registers/:id/close", () => {
    it("should close an open register", async () => {
      const register = await Register.create({
        registerNumber: "REG-CLOSE",
        openedBy: admin._id,
        openingCash: 100,
        status: "open",
      });

      const res = await request(app)
        .post(`/api/registers/${register._id}/close`)
        .set(authHeader(admin))
        .send({ closingCash: 150 });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("closed");
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // Device conflict: deviceId already bound to an open register
  // ─────────────────────────────────────────────────────────────────

  describe("POST /api/registers/open — device conflict", () => {
    it("should return 400 when deviceId is bound to another open register", async () => {
      // Open a register that is bound to device-XYZ
      await Register.create({
        registerNumber: "REG-DEVICE-001",
        openedBy: admin._id,
        openingCash: 0,
        status: "open",
        deviceId: "device-XYZ",
      });

      const anotherUser = await createUser({
        username: "another-user",
        permissions: ["sales"],
      });

      const res = await request(app)
        .post("/api/registers/open")
        .set(authHeader(anotherUser))
        .send({
          registerNumber: "REG-DEVICE-002",
          openingCash: 0,
          deviceId: "device-XYZ",
        });

      expect(res.status).toBe(400);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // Permission: only manager/admin can close a register
  // ─────────────────────────────────────────────────────────────────

  describe("POST /api/registers/:id/close — permission checks", () => {
    it("should return 403 when cashier tries to close a register", async () => {
      const cashierUser = await createUser({
        username: "cashier-close",
        role: "cashier",
        permissions: ["sales"],
      });

      const register = await Register.create({
        registerNumber: "REG-CASHIER-CLOSE",
        openedBy: cashierUser._id,
        openingCash: 50,
        status: "open",
      });

      const res = await request(app)
        .post(`/api/registers/${register._id}/close`)
        .set(authHeader(cashierUser))
        .send({ closingCash: 50 });

      expect(res.status).toBe(403);
    });

    it("should return 403 when employee tries to close a register", async () => {
      const employee = await createUser({
        username: "employee-close",
        role: "employee",
        permissions: [],
      });

      const register = await Register.create({
        registerNumber: "REG-EMP-CLOSE",
        openedBy: admin._id,
        openingCash: 0,
        status: "open",
      });

      const res = await request(app)
        .post(`/api/registers/${register._id}/close`)
        .set(authHeader(employee))
        .send({ closingCash: 0 });

      expect(res.status).toBe(403);
    });

    it("should return 400 or error when trying to close an already-closed register", async () => {
      const register = await Register.create({
        registerNumber: "REG-ALREADY-CLOSED",
        openedBy: admin._id,
        openingCash: 100,
        status: "closed",
        closedAt: new Date(),
        closedBy: admin._id,
      });

      const res = await request(app)
        .post(`/api/registers/${register._id}/close`)
        .set(authHeader(admin))
        .send({ closingCash: 100 });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // GET /api/registers/active/expected-cash
  // ─────────────────────────────────────────────────────────────────

  describe("GET /api/registers/active/expected-cash", () => {
    it("should return expected cash breakdown for an open register", async () => {
      // Open a register as admin first so there's an active register
      const openRes = await request(app)
        .post("/api/registers/open")
        .set(authHeader(admin))
        .send({ registerNumber: "REG-EXPECTED", openingCash: 200 });

      expect(openRes.status).toBe(201);

      const res = await request(app)
        .get("/api/registers/active/expected-cash")
        .set(authHeader(admin));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("expectedCash");
      expect(res.body).toHaveProperty("openingCash");
      expect(res.body).toHaveProperty("totalCashSales");
    });

    it("should return 401 without auth", async () => {
      const res = await request(app).get("/api/registers/active/expected-cash");
      expect(res.status).toBe(401);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // PATCH /api/registers/:id/print-setting
  // ─────────────────────────────────────────────────────────────────

  describe("PATCH /api/registers/:id/print-setting", () => {
    it("should toggle printReceiptsEnabled on a register", async () => {
      const register = await Register.create({
        registerNumber: "REG-PRINT",
        openedBy: admin._id,
        openingCash: 0,
        status: "open",
        printReceiptsEnabled: true,
      });

      const res = await request(app)
        .patch(`/api/registers/${register._id}/print-setting`)
        .set(authHeader(admin))
        .send({ printReceiptsEnabled: false });

      expect(res.status).toBe(200);
      expect(res.body.printReceiptsEnabled).toBe(false);
    });

    it("should return 401 without auth", async () => {
      const register = await Register.create({
        registerNumber: "REG-PRINT-UNAUTH",
        openedBy: admin._id,
        openingCash: 0,
        status: "open",
      });

      const res = await request(app)
        .patch(`/api/registers/${register._id}/print-setting`)
        .send({ printReceiptsEnabled: false });

      expect(res.status).toBe(401);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // GET /api/registers/available returns only closed registers
  // ─────────────────────────────────────────────────────────────────

  describe("GET /api/registers/available — open registers excluded", () => {
    it("should not include currently open registers in the available list", async () => {
      // Create one open and one closed register with different registerNumbers
      await Register.create({
        registerNumber: "REG-OPEN-AVAIL",
        openedBy: admin._id,
        openingCash: 0,
        status: "open",
      });

      await Register.create({
        registerNumber: "REG-CLOSED-AVAIL",
        openedBy: admin._id,
        openingCash: 0,
        status: "closed",
        closedAt: new Date(),
      });

      const res = await request(app)
        .get("/api/registers/available")
        .set(authHeader(admin));

      expect(res.status).toBe(200);
      const registers = res.body.registers || [];
      const numbers = registers.map((r) => r.registerNumber);
      expect(numbers).not.toContain("REG-OPEN-AVAIL");
    });
  });
});
