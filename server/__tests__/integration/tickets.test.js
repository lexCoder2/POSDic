require("..//helpers/setup");
const request = require("supertest");
const app = require("../../index");
const Ticket = require("../../models/Ticket");
const { authHeader, createAdminUser, createUser } = require("../helpers/auth");

let admin;
let cashier;

beforeEach(async () => {
  admin = await createAdminUser();
  cashier = await createUser({ username: "cashier1", permissions: ["sales"] });
});

const sampleItems = [
  { productName: "Bread", quantity: 2, unitPrice: 1.5, subtotal: 3.0 },
  { productName: "Milk", quantity: 1, unitPrice: 2.0, subtotal: 2.0 },
];

describe("Tickets API — Spec 6 Dispatcher/Checkout", () => {
  // ─── GET /api/tickets ───────────────────────────────────────────────────

  describe("GET /api/tickets", () => {
    it("should return 401 without auth token", async () => {
      const res = await request(app).get("/api/tickets");
      expect(res.status).toBe(401);
    });

    it("should return 200 with empty list when no tickets exist", async () => {
      const res = await request(app).get("/api/tickets").set(authHeader(admin));
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("tickets");
      expect(Array.isArray(res.body.tickets)).toBe(true);
    });

    it("should filter tickets by status query param", async () => {
      await Ticket.create({
        items: sampleItems,
        subtotal: 5.0,
        total: 5.0,
        status: "pending",
        createdBy: admin._id,
      });
      await Ticket.create({
        items: sampleItems,
        subtotal: 5.0,
        total: 5.0,
        status: "completed",
        createdBy: admin._id,
      });

      const res = await request(app)
        .get("/api/tickets?status=pending")
        .set(authHeader(cashier));
      expect(res.status).toBe(200);
      expect(res.body.tickets).toHaveLength(1);
      expect(res.body.tickets[0].status).toBe("pending");
    });
  });

  // ─── POST /api/tickets ──────────────────────────────────────────────────

  describe("POST /api/tickets", () => {
    it("should return 401 without auth token", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .send({ items: sampleItems });
      expect(res.status).toBe(401);
    });

    it("should return 400 when items array is missing", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .set(authHeader(cashier))
        .send({ subtotal: 5.0, total: 5.0 });
      expect(res.status).toBe(400);
    });

    it("should return 400 when items array is empty", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .set(authHeader(cashier))
        .send({ items: [], subtotal: 0, total: 0 });
      expect(res.status).toBe(400);
    });

    it("should return 201 and create ticket with valid items", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .set(authHeader(cashier))
        .send({ items: sampleItems, subtotal: 5.0, total: 5.0 });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("ticket");
      expect(res.body.ticket.status).toBe("pending");
      expect(res.body.ticket.items).toHaveLength(2);
    });

    it("should auto-assign a ticketNumber", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .set(authHeader(cashier))
        .send({ items: sampleItems, subtotal: 5.0, total: 5.0 });
      expect(res.status).toBe(201);
      expect(res.body.ticket).toHaveProperty("ticketNumber");
      expect(typeof res.body.ticket.ticketNumber).toBe("number");
    });

    it("should set createdBy to current user", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .set(authHeader(cashier))
        .send({
          items: sampleItems,
          subtotal: 5.0,
          total: 5.0,
          notes: "Table 3",
        });
      expect(res.status).toBe(201);
      expect(res.body.ticket.notes).toBe("Table 3");
      expect(res.body.ticket.createdBy).toBeTruthy();
    });
  });

  // ─── GET /api/tickets/:id ───────────────────────────────────────────────

  describe("GET /api/tickets/:id", () => {
    it("should return 404 for non-existent ticket", async () => {
      const fakeId = "64a1234567890abcdef12345";
      const res = await request(app)
        .get(`/api/tickets/${fakeId}`)
        .set(authHeader(admin));
      expect(res.status).toBe(404);
    });

    it("should return 200 with ticket data", async () => {
      const ticket = await Ticket.create({
        items: sampleItems,
        subtotal: 5.0,
        total: 5.0,
        status: "pending",
        createdBy: admin._id,
      });

      const res = await request(app)
        .get(`/api/tickets/${ticket._id}`)
        .set(authHeader(cashier));
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("ticket");
      expect(res.body.ticket._id.toString()).toBe(ticket._id.toString());
    });
  });

  // ─── PUT /api/tickets/:id/claim ─────────────────────────────────────────

  describe("PUT /api/tickets/:id/claim", () => {
    it("should set status to in_checkout", async () => {
      const ticket = await Ticket.create({
        items: sampleItems,
        subtotal: 5.0,
        total: 5.0,
        status: "pending",
        createdBy: admin._id,
      });

      const res = await request(app)
        .put(`/api/tickets/${ticket._id}/claim`)
        .set(authHeader(cashier));
      expect(res.status).toBe(200);
      expect(res.body.ticket.status).toBe("in_checkout");
    });

    it("should return 400 when ticket is already claimed", async () => {
      const ticket = await Ticket.create({
        items: sampleItems,
        subtotal: 5.0,
        total: 5.0,
        status: "in_checkout",
        createdBy: admin._id,
      });

      const res = await request(app)
        .put(`/api/tickets/${ticket._id}/claim`)
        .set(authHeader(cashier));
      expect(res.status).toBe(400);
    });
  });

  // ─── PUT /api/tickets/:id/complete ─────────────────────────────────────

  describe("PUT /api/tickets/:id/complete", () => {
    it("should return 400 when paymentMethod is missing", async () => {
      const ticket = await Ticket.create({
        items: sampleItems,
        subtotal: 5.0,
        total: 5.0,
        status: "in_checkout",
        createdBy: admin._id,
      });

      const res = await request(app)
        .put(`/api/tickets/${ticket._id}/complete`)
        .set(authHeader(cashier))
        .send({});
      expect(res.status).toBe(400);
    });

    it("should complete ticket and create a Sale", async () => {
      const ticket = await Ticket.create({
        items: sampleItems,
        subtotal: 5.0,
        total: 5.0,
        status: "in_checkout",
        createdBy: admin._id,
      });

      const res = await request(app)
        .put(`/api/tickets/${ticket._id}/complete`)
        .set(authHeader(cashier))
        .send({ paymentMethod: "cash", amountTendered: 10.0 });
      expect(res.status).toBe(200);
      expect(res.body.ticket.status).toBe("completed");
      expect(res.body).toHaveProperty("sale");
    });
  });

  // ─── PUT /api/tickets/:id/cancel ─────────────────────────────────────────

  describe("PUT /api/tickets/:id/cancel", () => {
    it("should cancel a pending ticket", async () => {
      const ticket = await Ticket.create({
        items: sampleItems,
        subtotal: 5.0,
        total: 5.0,
        status: "pending",
        createdBy: admin._id,
      });

      const res = await request(app)
        .put(`/api/tickets/${ticket._id}/cancel`)
        .set(authHeader(cashier));
      expect(res.status).toBe(200);
      expect(res.body.ticket.status).toBe("cancelled");
    });

    it("should return 400 when canceling an already completed ticket", async () => {
      const ticket = await Ticket.create({
        items: sampleItems,
        subtotal: 5.0,
        total: 5.0,
        status: "completed",
        createdBy: admin._id,
      });

      const res = await request(app)
        .put(`/api/tickets/${ticket._id}/cancel`)
        .set(authHeader(cashier));
      expect(res.status).toBe(400);
    });
  });
});
