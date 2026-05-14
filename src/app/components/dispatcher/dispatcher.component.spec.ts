import { ComponentFixture, TestBed } from "@angular/core/testing";
import { NO_ERRORS_SCHEMA } from "@angular/core";
import { of, throwError } from "rxjs";
import { EMPTY } from "rxjs";
import { DispatcherComponent } from "./dispatcher.component";
import { TicketService } from "../../services/ticket.service";
import { ToastService } from "../../services/toast.service";
import { TranslationService } from "../../services/translation.service";

const mockTicket = {
  _id: "ticket1",
  ticketNumber: 42,
  items: [{ productName: "Bread", quantity: 1, unitPrice: 2.0, subtotal: 2.0 }],
  subtotal: 2.0,
  total: 2.0,
  status: "pending" as const,
};

describe("DispatcherComponent", () => {
  let component: DispatcherComponent;
  let fixture: ComponentFixture<DispatcherComponent>;
  let ticketServiceSpy: any;
  let toastSpy: any;

  beforeEach(async () => {
    ticketServiceSpy = {
      createTicket: jest.fn().mockReturnValue(of(mockTicket)),
      cancelTicket: jest
        .fn()
        .mockReturnValue(of({ ...mockTicket, status: "cancelled" })),
    };
    toastSpy = { show: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [DispatcherComponent],
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

    fixture = TestBed.createComponent(DispatcherComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should start with empty cart", () => {
    expect(component.items()).toHaveLength(0);
    expect(component.total()).toBe(0);
  });

  describe("addItem()", () => {
    it("should add item to cart", () => {
      component.addItem({
        productName: "Milk",
        quantity: 1,
        unitPrice: 1.5,
        subtotal: 1.5,
      });
      expect(component.items()).toHaveLength(1);
    });

    it("should increase quantity when same product added again", () => {
      component.addItem({
        productName: "Milk",
        quantity: 1,
        unitPrice: 1.5,
        subtotal: 1.5,
      });
      component.addItem({
        productName: "Milk",
        quantity: 1,
        unitPrice: 1.5,
        subtotal: 1.5,
      });
      expect(component.items()).toHaveLength(1);
      expect(component.items()[0].quantity).toBe(2);
    });

    it("should recalculate total after adding", () => {
      component.addItem({
        productName: "Milk",
        quantity: 2,
        unitPrice: 1.5,
        subtotal: 3.0,
      });
      expect(component.total()).toBeCloseTo(3.0);
    });
  });

  describe("removeItem()", () => {
    it("should remove item from cart by index", () => {
      component.addItem({
        productName: "Milk",
        quantity: 1,
        unitPrice: 1.5,
        subtotal: 1.5,
      });
      component.removeItem(0);
      expect(component.items()).toHaveLength(0);
    });
  });

  describe("dispatchTicket()", () => {
    it("should show error when cart is empty", () => {
      component.dispatchTicket();
      expect(toastSpy.show).toHaveBeenCalled();
      expect(ticketServiceSpy.createTicket).not.toHaveBeenCalled();
    });

    it("should call ticketService.createTicket with items", () => {
      component.addItem({
        productName: "Milk",
        quantity: 1,
        unitPrice: 1.5,
        subtotal: 1.5,
      });
      component.dispatchTicket();
      expect(ticketServiceSpy.createTicket).toHaveBeenCalled();
    });

    it("should show ticket number on success", () => {
      component.addItem({
        productName: "Bread",
        quantity: 1,
        unitPrice: 2.0,
        subtotal: 2.0,
      });
      component.dispatchTicket();
      expect(toastSpy.show).toHaveBeenCalledWith(expect.any(String), "success");
    });

    it("should clear cart after successful dispatch", () => {
      component.addItem({
        productName: "Bread",
        quantity: 1,
        unitPrice: 2.0,
        subtotal: 2.0,
      });
      component.dispatchTicket();
      expect(component.items()).toHaveLength(0);
    });

    it("should show last dispatched ticket number", () => {
      component.addItem({
        productName: "Bread",
        quantity: 1,
        unitPrice: 2.0,
        subtotal: 2.0,
      });
      component.dispatchTicket();
      expect(component.lastDispatchedTicketNumber()).toBe(42);
    });

    it("should show error toast on service failure", () => {
      ticketServiceSpy.createTicket.mockReturnValue(
        throwError(() => new Error("error"))
      );
      component.addItem({
        productName: "Bread",
        quantity: 1,
        unitPrice: 2.0,
        subtotal: 2.0,
      });
      component.dispatchTicket();
      expect(toastSpy.show).toHaveBeenCalledWith(expect.any(String), "error");
    });
  });

  describe("clearCart()", () => {
    it("should clear all items", () => {
      component.addItem({
        productName: "Milk",
        quantity: 1,
        unitPrice: 1.5,
        subtotal: 1.5,
      });
      component.clearCart();
      expect(component.items()).toHaveLength(0);
      expect(component.total()).toBe(0);
    });
  });
});
