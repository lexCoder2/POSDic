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

describe("AI Categorization API — Spec 10", () => {
  // ─── POST /api/ai/categorize ─────────────────────────────────────────────

  describe("POST /api/ai/categorize", () => {
    it("should return 401 without auth token", async () => {
      const res = await request(app)
        .post("/api/ai/categorize")
        .send({ name: "Whole Milk 1L", brand: "Lala" });
      expect(res.status).toBe(401);
    });

    it("should return 403 for cashier (no inventory permission)", async () => {
      const res = await request(app)
        .post("/api/ai/categorize")
        .set(authHeader(cashier))
        .send({ name: "Whole Milk 1L", brand: "Lala" });
      expect(res.status).toBe(403);
    });

    it("should return 400 when product name is missing", async () => {
      const res = await request(app)
        .post("/api/ai/categorize")
        .set(authHeader(admin))
        .send({});
      expect(res.status).toBe(400);
    });

    it("should return 200 with category suggestion (heuristic fallback)", async () => {
      const res = await request(app)
        .post("/api/ai/categorize")
        .set(authHeader(admin))
        .send({ name: "Whole Milk 1L", brand: "Lala", type: "dairy" });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("category");
      expect(typeof res.body.category).toBe("string");
      expect(res.body).toHaveProperty("source");
      expect(["ollama", "heuristic"]).toContain(res.body.source);
    });

    it("should include confidence field in response", async () => {
      const res = await request(app)
        .post("/api/ai/categorize")
        .set(authHeader(admin))
        .send({ name: "White Bread", brand: "Bimbo" });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("confidence");
      expect(typeof res.body.confidence).toBe("number");
    });

    it("should fall back to heuristic when Ollama is unavailable", async () => {
      // The test environment never has Ollama running, so this always triggers heuristic
      const res = await request(app)
        .post("/api/ai/categorize")
        .set(authHeader(admin))
        .send({ name: "Apple Juice 500ml" });
      expect(res.status).toBe(200);
      expect(res.body.source).toBe("heuristic");
    });
  });

  // ─── POST /api/ai/categorize/batch ──────────────────────────────────────

  describe("POST /api/ai/categorize/batch", () => {
    it("should return 401 without auth token", async () => {
      const res = await request(app)
        .post("/api/ai/categorize/batch")
        .send({ products: [{ name: "Milk" }] });
      expect(res.status).toBe(401);
    });

    it("should return 400 when products array is missing or empty", async () => {
      const res = await request(app)
        .post("/api/ai/categorize/batch")
        .set(authHeader(admin))
        .send({});
      expect(res.status).toBe(400);
    });

    it("should return 200 with array of categorized products", async () => {
      const res = await request(app)
        .post("/api/ai/categorize/batch")
        .set(authHeader(admin))
        .send({
          products: [
            { name: "Whole Milk 1L", brand: "Lala" },
            { name: "White Bread 500g", brand: "Bimbo" },
          ],
        });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("results");
      expect(Array.isArray(res.body.results)).toBe(true);
      expect(res.body.results).toHaveLength(2);
      expect(res.body.results[0]).toHaveProperty("category");
      expect(res.body.results[0]).toHaveProperty("source");
    });
  });
});
