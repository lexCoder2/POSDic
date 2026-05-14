import { TestBed } from "@angular/core/testing";
import {
  HttpClientTestingModule,
  HttpTestingController,
} from "@angular/common/http/testing";
import { TicketService } from "./ticket.service";
import { Ticket, TicketItem } from "../models";

const mockItems: TicketItem[] = [
  { productName: "Bread", quantity: 2, unitPrice: 1.5, subtotal: 3.0 },
  { productName: "Milk", quantity: 1, unitPrice: 2.0, subtotal: 2.0 },
];

const mockTicket: Ticket = {
  _id: "ticket1",
  ticketNumber: 1,
  items: mockItems,
  subtotal: 5.0,
  total: 5.0,
  status: "pending",
};

describe("TicketService", () => {
  let service: TicketService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TicketService],
    });
    service = TestBed.inject(TicketService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  describe("getTickets()", () => {
    it("should GET /api/tickets and return tickets", () => {
      service.getTickets().subscribe((tickets) => {
        expect(tickets).toHaveLength(1);
        expect(tickets[0]._id).toBe("ticket1");
      });
      const req = httpMock.expectOne((r) => r.url.includes("/api/tickets"));
      expect(req.request.method).toBe("GET");
      req.flush({ tickets: [mockTicket] });
    });

    it("should filter by status when provided", () => {
      service.getTickets("pending").subscribe();
      const req = httpMock.expectOne((r) =>
        r.urlWithParams.includes("status=pending")
      );
      req.flush({ tickets: [] });
    });
  });

  describe("getTicket()", () => {
    it("should GET /api/tickets/:id", () => {
      service.getTicket("ticket1").subscribe((t) => {
        expect(t._id).toBe("ticket1");
      });
      const req = httpMock.expectOne((r) =>
        r.url.includes("/api/tickets/ticket1")
      );
      req.flush({ ticket: mockTicket });
    });
  });

  describe("createTicket()", () => {
    it("should POST /api/tickets with items", () => {
      service.createTicket(mockItems, 5.0, 5.0).subscribe((t) => {
        expect(t.status).toBe("pending");
      });
      const req = httpMock.expectOne((r) => r.url.includes("/api/tickets"));
      expect(req.request.method).toBe("POST");
      expect(req.request.body.items).toHaveLength(2);
      req.flush({ ticket: mockTicket });
    });

    it("should include optional notes", () => {
      service.createTicket(mockItems, 5.0, 5.0, 0, "Table 3").subscribe();
      const req = httpMock.expectOne(
        (r) => r.url.includes("/api/tickets") && r.method === "POST"
      );
      expect(req.request.body.notes).toBe("Table 3");
      req.flush({ ticket: mockTicket });
    });
  });

  describe("claimTicket()", () => {
    it("should PUT /api/tickets/:id/claim", () => {
      service.claimTicket("ticket1").subscribe((t) => {
        expect(t._id).toBe("ticket1");
      });
      const req = httpMock.expectOne((r) => r.url.includes("/claim"));
      expect(req.request.method).toBe("PUT");
      req.flush({ ticket: { ...mockTicket, status: "in_checkout" } });
    });
  });

  describe("completeTicket()", () => {
    it("should PUT /api/tickets/:id/complete with paymentMethod", () => {
      service.completeTicket("ticket1", "cash", 10.0).subscribe((t) => {
        expect(t._id).toBe("ticket1");
      });
      const req = httpMock.expectOne((r) => r.url.includes("/complete"));
      expect(req.request.method).toBe("PUT");
      expect(req.request.body.paymentMethod).toBe("cash");
      req.flush({ ticket: { ...mockTicket, status: "completed" } });
    });
  });

  describe("cancelTicket()", () => {
    it("should PUT /api/tickets/:id/cancel", () => {
      service.cancelTicket("ticket1").subscribe((t) => {
        expect(t._id).toBe("ticket1");
      });
      const req = httpMock.expectOne((r) => r.url.includes("/cancel"));
      expect(req.request.method).toBe("PUT");
      req.flush({ ticket: { ...mockTicket, status: "cancelled" } });
    });
  });
});
