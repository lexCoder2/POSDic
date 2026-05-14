import { ComponentFixture, TestBed } from "@angular/core/testing";
import { NO_ERRORS_SCHEMA } from "@angular/core";
import { of, throwError } from "rxjs";
import { EMPTY } from "rxjs";
import { CheckoutDeskComponent } from "./checkout-desk.component";
import { TicketService } from "../../services/ticket.service";
import { ToastService } from "../../services/toast.service";
import { TranslationService } from "../../services/translation.service";

const mockPendingTicket = {
  _id: "ticket1",
  ticketNumber: 42,
  items: [{ productName: "Bread", quantity: 1, unitPrice: 2.0, subtotal: 2.0 }],
  subtotal: 2.0,
  total: 2.0,
  status: "pending" as const,
};

describe("CheckoutDeskComponent", () => {
  let component: CheckoutDeskComponent;
  let fixture: ComponentFixture<CheckoutDeskComponent>;
  let ticketServiceSpy: any;
  let toastSpy: any;

  beforeEach(async () => {
    ticketServiceSpy = {
      getTickets: jest.fn().mockReturnValue(of([mockPendingTicket])),
      claimTicket: jest
        .fn()
        .mockReturnValue(of({ ...mockPendingTicket, status: "in_checkout" })),
      completeTicket: jest
        .fn()
        .mockReturnValue(of({ ...mockPendingTicket, status: "completed" })),
      cancelTicket: jest
        .fn()
        .mockReturnValue(of({ ...mockPendingTicket, status: "cancelled" })),
    };
    toastSpy = { show: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [CheckoutDeskComponent],
      providers: [
        { provide: TicketService, useValue: ticketServiceSpy },
        { provide: ToastService, useValue: toastSpy },
        {
          provide: TranslationService,
          useValue: {
            translate: jest.fn().mockReturnValue(""),
            translationsChanged$: EMPTY,
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(CheckoutDeskComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should load pending tickets on init", () => {
    expect(ticketServiceSpy.getTickets).toHaveBeenCalledWith("pending");
    expect(component.tickets()).toHaveLength(1);
  });

  it("should poll for new tickets periodically", () => {
    expect(component.pollingInterval).toBeDefined();
  });

  it("should render queue summary metrics for pending tickets", () => {
    const metrics = fixture.nativeElement.querySelectorAll(
      ".checkout-desk__queue-metric"
    );

    expect(metrics).toHaveLength(2);
    expect(metrics[0].textContent).toContain("1");
    expect(metrics[1].textContent).toContain("2.00");
  });

  it("should render queue ticket previews for faster scanning", () => {
    const preview = fixture.nativeElement.querySelector(
      ".checkout-desk__ticket-card-preview"
    );

    expect(preview).toBeTruthy();
    expect(preview.textContent).toContain("Bread");
  });

  it("should render payment stats for the selected cash ticket", () => {
    component.selectedTicket.set(mockPendingTicket as any);
    component.selectedPaymentMethod.set("cash");
    component.amountTendered.set(5);
    fixture.detectChanges();

    const statElements = fixture.nativeElement.querySelectorAll(
      ".checkout-desk__payment-stat"
    ) as NodeListOf<HTMLElement>;
    const stats = Array.from(statElements).map(
      (element) => element.textContent ?? ""
    );

    expect(stats).toHaveLength(3);
    expect(stats.some((text) => text.includes("2.00"))).toBe(true);
    expect(stats.some((text) => text.includes("5.00"))).toBe(true);
    expect(stats.some((text) => text.includes("3.00"))).toBe(true);
  });

  describe("selectTicket()", () => {
    it("should set selectedTicket and claim it", () => {
      component.selectTicket(mockPendingTicket as any);
      expect(ticketServiceSpy.claimTicket).toHaveBeenCalledWith("ticket1");
      expect(component.selectedTicket()).toBeTruthy();
    });
  });

  describe("completeCheckout()", () => {
    it("should show error when no payment method selected", () => {
      component.selectedTicket.set(mockPendingTicket as any);
      component.selectedPaymentMethod.set("");
      component.completeCheckout();
      expect(toastSpy.show).toHaveBeenCalled();
      expect(ticketServiceSpy.completeTicket).not.toHaveBeenCalled();
    });

    it("should call completeTicket with paymentMethod", () => {
      component.selectedTicket.set(mockPendingTicket as any);
      component.selectedPaymentMethod.set("cash");
      component.amountTendered.set(10.0);
      component.completeCheckout();
      expect(ticketServiceSpy.completeTicket).toHaveBeenCalledWith(
        "ticket1",
        "cash",
        10.0
      );
    });

    it("should show success toast and clear selection on completion", () => {
      component.selectedTicket.set(mockPendingTicket as any);
      component.selectedPaymentMethod.set("cash");
      component.completeCheckout();
      expect(toastSpy.show).toHaveBeenCalledWith(expect.any(String), "success");
      expect(component.selectedTicket()).toBeNull();
    });
  });

  describe("cancelSelectedTicket()", () => {
    it("should cancel the selected ticket", () => {
      component.selectedTicket.set(mockPendingTicket as any);
      component.cancelSelectedTicket();
      expect(ticketServiceSpy.cancelTicket).toHaveBeenCalledWith("ticket1");
    });

    it("should clear selection and refresh list after cancel", () => {
      component.selectedTicket.set(mockPendingTicket as any);
      component.cancelSelectedTicket();
      expect(component.selectedTicket()).toBeNull();
    });
  });

  describe("loadTickets()", () => {
    it("should handle errors gracefully", () => {
      ticketServiceSpy.getTickets.mockReturnValue(
        throwError(() => new Error("Network error"))
      );
      component.loadTickets();
      expect(component.isLoading()).toBe(false);
    });
  });
});
