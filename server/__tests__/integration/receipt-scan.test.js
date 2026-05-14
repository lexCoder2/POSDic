require("..//helpers/setup");
const request = require("supertest");
const app = require("../../index");
const { authHeader, createAdminUser, createUser } = require("../helpers/auth");

let admin;
let cashier;

beforeEach(async () => {
  admin = await createAdminUser();
  cashier = await createUser({ username: "cashier1", permissions: ["sales"] });
});

describe("Receipt Scanning API — Spec 11", () => {
  // ─── POST /api/receipt-scan/parse ─────────────────────────────────────────

  describe("POST /api/receipt-scan/parse", () => {
    it("should return 401 without auth token", async () => {
      const res = await request(app)
        .post("/api/receipt-scan/parse")
        .send({ text: "Some receipt text" });
      expect(res.status).toBe(401);
    });

    it("should return 403 for cashier (no inventory permission)", async () => {
      const res = await request(app)
        .post("/api/receipt-scan/parse")
        .set(authHeader(cashier))
        .send({ text: "Some receipt text" });
      expect(res.status).toBe(403);
    });

    it("should return 400 when text is missing", async () => {
      const res = await request(app)
        .post("/api/receipt-scan/parse")
        .set(authHeader(admin))
        .send({});
      expect(res.status).toBe(400);
    });

    it("should return 200 with parsed receipt data", async () => {
      const receiptText = `
        BIMBO BAKERIES
        Ref: 12345
        -------------------------
        Pan Blanco 500g x2   $3.00
        Pan Integral 400g x1 $2.50
        -------------------------
        TOTAL: $8.50
        Date: 2024-01-15
      `;
      const res = await request(app)
        .post("/api/receipt-scan/parse")
        .set(authHeader(admin))
        .send({ text: receiptText });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("provider");
      expect(res.body).toHaveProperty("items");
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body).toHaveProperty("total");
      expect(res.body).toHaveProperty("date");
    });

    it("should detect provider name from receipt header", async () => {
      const receiptText = `
        COCA COLA COMPANY
        Invoice #98765
        Coca Cola 600ml x10   $15.00
        Sprite 600ml x5       $7.50
        TOTAL: $22.50
      `;
      const res = await request(app)
        .post("/api/receipt-scan/parse")
        .set(authHeader(admin))
        .send({ text: receiptText });
      expect(res.status).toBe(200);
      expect(res.body.provider).toBeTruthy();
    });

    it("should extract item quantities and prices", async () => {
      const receiptText = `
        SUPPLIER INC
        Item A x2   $4.00
        Item B x1   $2.00
        TOTAL: $6.00
      `;
      const res = await request(app)
        .post("/api/receipt-scan/parse")
        .set(authHeader(admin))
        .send({ text: receiptText });
      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeGreaterThan(0);
      const itemA = res.body.items.find((i) => /item a/i.test(i.name));
      expect(itemA).toBeDefined();
      expect(itemA.quantity).toBe(2);
    });
  });
});
