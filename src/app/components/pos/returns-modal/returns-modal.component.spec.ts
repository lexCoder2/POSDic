import { ComponentFixture, TestBed } from "@angular/core/testing";
import { NO_ERRORS_SCHEMA, SimpleChange } from "@angular/core";
import { of, throwError } from "rxjs";
import { ReturnsModalComponent } from "./returns-modal.component";
import { SaleService } from "../../../services/sale.service";
import { ToastService } from "../../../services/toast.service";
import { TranslationService } from "../../../services/translation.service";
import { EMPTY } from "rxjs";

const makeTranslationMock = () => ({
  translate: jest.fn().mockReturnValue(""),
  current: "en",
  translationsChanged$: EMPTY,
});

const makeSaleServiceMock = () => ({
  getSales: jest.fn().mockReturnValue(of({ data: [], total: 0 })),
  refundSale: jest.fn().mockReturnValue(of({})),
});

const makeToastMock = () => ({
  show: jest.fn(),
});

const mockSale = {
  _id: "sale-1",
  saleNumber: 1001,
  total: 150,
  items: [
    {
      _id: "item-1",
      productName: "Widget",
      quantity: 2,
      unitPrice: 75,
      product: { name: "Widget" },
    },
  ],
  status: "completed",
  createdAt: new Date("2024-01-15"),
} as any;

describe("ReturnsModalComponent", () => {
  let component: ReturnsModalComponent;
  let fixture: ComponentFixture<ReturnsModalComponent>;
  let saleServiceMock: ReturnType<typeof makeSaleServiceMock>;
  let toastMock: ReturnType<typeof makeToastMock>;

  beforeEach(async () => {
    saleServiceMock = makeSaleServiceMock();
    toastMock = makeToastMock();

    await TestBed.configureTestingModule({
      imports: [ReturnsModalComponent],
      providers: [
        { provide: SaleService, useValue: saleServiceMock },
        { provide: ToastService, useValue: toastMock },
        { provide: TranslationService, useValue: makeTranslationMock() },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(ReturnsModalComponent);
    component = fixture.componentInstance;
    // Don't call detectChanges on template render
  });

  afterEach(() => TestBed.resetTestingModule());

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  // ──────────────────────────────────────────────
  // ngOnChanges / resetModal
  // ──────────────────────────────────────────────

  describe("ngOnChanges()", () => {
    it("resets modal when show becomes true", () => {
      component.searchQuery = "old-search";
      component.show = true;
      component.ngOnChanges({ show: new SimpleChange(false, true, false) });
      expect(component.searchQuery).toBe("");
    });

    it("does not reset when show stays false", () => {
      component.searchQuery = "keep-me";
      component.ngOnChanges({ show: new SimpleChange(false, false, false) });
      expect(component.searchQuery).toBe("keep-me");
    });
  });

  describe("resetModal()", () => {
    it("clears all state", () => {
      component.searchQuery = "x";
      component.selectedSale = mockSale;
      component.refundType = "partial";
      component.refundReason = "reason";
      component.isProcessing = true;
      component.resetModal();
      expect(component.searchQuery).toBe("");
      expect(component.selectedSale).toBeNull();
      expect(component.refundType).toBe("full");
      expect(component.refundReason).toBe("");
      expect(component.isProcessing).toBe(false);
    });
  });

  // ──────────────────────────────────────────────
  // searchSales()
  // ──────────────────────────────────────────────

  describe("searchSales()", () => {
    it("clears results when query is empty", () => {
      component.searchQuery = "   ";
      component.searchSales();
      expect(saleServiceMock.getSales).not.toHaveBeenCalled();
    });

    it("calls SaleService with trimmed query", () => {
      saleServiceMock.getSales.mockReturnValue(
        of({ data: [mockSale], total: 1 })
      );
      component.searchQuery = "1001";
      component.searchSales();
      expect(saleServiceMock.getSales).toHaveBeenCalledWith(
        expect.objectContaining({ search: "1001" })
      );
      expect(component.searchResults()).toEqual([mockSale]);
      expect(component.isSearching).toBe(false);
    });

    it("handles search error", () => {
      saleServiceMock.getSales.mockReturnValue(
        throwError(() => new Error("fail"))
      );
      component.searchQuery = "anything";
      component.searchSales();
      expect(toastMock.show).toHaveBeenCalledWith(
        "Error searching sales",
        "error"
      );
      expect(component.isSearching).toBe(false);
    });
  });

  // ──────────────────────────────────────────────
  // selectSale()
  // ──────────────────────────────────────────────

  describe("selectSale()", () => {
    it("sets selectedSale and populates refundItems", () => {
      component.selectSale(mockSale);
      expect(component.selectedSale).toBe(mockSale);
      expect(component.refundItems.length).toBe(1);
      expect(component.refundItems[0].productName).toBe("Widget");
      expect(component.refundItems[0].maxQuantity).toBe(2);
      expect(component.refundItems[0].selected).toBe(false);
    });
  });

  // ──────────────────────────────────────────────
  // getProductName()
  // ──────────────────────────────────────────────

  describe("getProductName()", () => {
    it('returns "Unknown Product" for falsy input', () => {
      expect(component.getProductName(null)).toBe("Unknown Product");
    });

    it("returns string product as-is", () => {
      expect(component.getProductName("some-id")).toBe("some-id");
    });

    it("returns product.name from object", () => {
      expect(component.getProductName({ name: "Coffee" })).toBe("Coffee");
    });

    it('returns "Unknown Product" when name is absent', () => {
      expect(component.getProductName({})).toBe("Unknown Product");
    });
  });

  // ──────────────────────────────────────────────
  // getCashierName()
  // ──────────────────────────────────────────────

  describe("getCashierName()", () => {
    it('returns "Unknown" for falsy', () => {
      expect(component.getCashierName(null)).toBe("Unknown");
    });

    it("returns string cashier as-is", () => {
      expect(component.getCashierName("Ana")).toBe("Ana");
    });

    it("returns firstName + lastName", () => {
      expect(
        component.getCashierName({ firstName: "Ana", lastName: "G" })
      ).toBe("Ana G");
    });

    it("falls back to username", () => {
      expect(component.getCashierName({ username: "ana_g" })).toBe("ana_g");
    });
  });

  // ──────────────────────────────────────────────
  // formatDate()
  // ──────────────────────────────────────────────

  describe("formatDate()", () => {
    it("returns empty string for undefined", () => {
      expect(component.formatDate(undefined)).toBe("");
    });

    it("returns formatted date string", () => {
      const result = component.formatDate("2024-01-15T12:00:00Z");
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
    });
  });

  // ──────────────────────────────────────────────
  // refund item helpers
  // ──────────────────────────────────────────────

  describe("toggleItemSelection()", () => {
    it("toggles item selected state", () => {
      const item = {
        selected: false,
        quantity: 3,
        maxQuantity: 3,
        itemId: "1",
        productName: "A",
        unitPrice: 10,
      };
      component.toggleItemSelection(item);
      expect(item.selected).toBe(true);
    });

    it("resets quantity to maxQuantity when deselecting", () => {
      const item = {
        selected: true,
        quantity: 1,
        maxQuantity: 3,
        itemId: "1",
        productName: "A",
        unitPrice: 10,
      };
      component.toggleItemSelection(item);
      expect(item.selected).toBe(false);
      expect(item.quantity).toBe(3);
    });
  });

  describe("hasSelectedItems()", () => {
    it("returns false when no items selected", () => {
      component.refundItems = [
        {
          selected: false,
          quantity: 1,
          maxQuantity: 1,
          itemId: "1",
          productName: "A",
          unitPrice: 10,
        },
      ];
      expect(component.hasSelectedItems()).toBe(false);
    });

    it("returns true when at least one item selected", () => {
      component.refundItems = [
        {
          selected: true,
          quantity: 1,
          maxQuantity: 1,
          itemId: "1",
          productName: "A",
          unitPrice: 10,
        },
      ];
      expect(component.hasSelectedItems()).toBe(true);
    });
  });

  describe("canProcessRefund()", () => {
    it("returns false with no selected sale", () => {
      component.selectedSale = null;
      expect(component.canProcessRefund()).toBe(false);
    });

    it("returns false with no reason", () => {
      component.selectedSale = mockSale;
      component.refundReason = "";
      expect(component.canProcessRefund()).toBe(false);
    });

    it("returns false for partial refund with no selected items", () => {
      component.selectedSale = mockSale;
      component.refundReason = "Damaged";
      component.refundType = "partial";
      component.refundItems = [
        {
          selected: false,
          quantity: 1,
          maxQuantity: 1,
          itemId: "1",
          productName: "A",
          unitPrice: 10,
        },
      ];
      expect(component.canProcessRefund()).toBe(false);
    });

    it("returns true for full refund with reason", () => {
      component.selectedSale = mockSale;
      component.refundReason = "Customer return";
      component.refundType = "full";
      expect(component.canProcessRefund()).toBe(true);
    });
  });

  // ──────────────────────────────────────────────
  // processRefund()
  // ──────────────────────────────────────────────

  describe("processRefund()", () => {
    it("does nothing when canProcessRefund is false", () => {
      component.selectedSale = null;
      component.processRefund();
      expect(saleServiceMock.refundSale).not.toHaveBeenCalled();
    });

    it("emits refundComplete and calls toastService on success", () => {
      saleServiceMock.refundSale.mockReturnValue(
        of({ ...mockSale, status: "refunded" })
      );
      const emitSpy = jest.spyOn(component.refundComplete, "emit");
      component.selectedSale = mockSale;
      component.refundReason = "Return";
      component.refundType = "full";
      component.processRefund();
      expect(emitSpy).toHaveBeenCalled();
      expect(toastMock.show).toHaveBeenCalledWith(
        expect.stringContaining("Full"),
        "success"
      );
    });

    it("shows error toast on failure", () => {
      saleServiceMock.refundSale.mockReturnValue(
        throwError(() => ({ error: { message: "Refund failed" } }))
      );
      component.selectedSale = mockSale;
      component.refundReason = "Return";
      component.refundType = "full";
      component.processRefund();
      expect(toastMock.show).toHaveBeenCalledWith("Refund failed", "error");
    });
  });

  // ──────────────────────────────────────────────
  // onClose / goBackToSearch
  // ──────────────────────────────────────────────

  describe("onClose()", () => {
    it("emits close event", () => {
      const closeSpy = jest.spyOn(component.close, "emit");
      component.onClose();
      expect(closeSpy).toHaveBeenCalled();
    });
  });

  describe("goBackToSearch()", () => {
    it("clears selected sale and items", () => {
      component.selectedSale = mockSale;
      component.refundItems = [
        {
          selected: true,
          quantity: 1,
          maxQuantity: 1,
          itemId: "1",
          productName: "A",
          unitPrice: 10,
        },
      ];
      component.goBackToSearch();
      expect(component.selectedSale).toBeNull();
      expect(component.refundItems).toEqual([]);
    });
  });

  // ──────────────────────────────────────────────
  // onRefundTypeChange()
  // ──────────────────────────────────────────────

  describe("onRefundTypeChange()", () => {
    it("deselects all items when switching to full", () => {
      component.refundItems = [
        {
          selected: true,
          quantity: 1,
          maxQuantity: 3,
          itemId: "1",
          productName: "A",
          unitPrice: 10,
        },
      ];
      component.refundType = "full";
      component.onRefundTypeChange();
      expect(component.refundItems[0].selected).toBe(false);
      expect(component.refundItems[0].quantity).toBe(3);
    });
  });

  // ──────────────────────────────────────────────
  // refundTotal computed
  // ──────────────────────────────────────────────

  describe("refundTotal computed", () => {
    it("returns 0 when no sale selected", () => {
      component.selectedSale = null;
      expect(component.refundTotal()).toBe(0);
    });

    it("returns sale total for full refund", () => {
      component.selectedSale = mockSale;
      component.refundType = "full";
      expect(component.refundTotal()).toBe(150);
    });

    it("sums selected items for partial refund", () => {
      component.selectedSale = mockSale;
      component.refundType = "partial";
      component.refundItems = [
        {
          selected: true,
          quantity: 2,
          maxQuantity: 2,
          itemId: "1",
          productName: "Widget",
          unitPrice: 30,
        },
        {
          selected: false,
          quantity: 1,
          maxQuantity: 1,
          itemId: "2",
          productName: "Other",
          unitPrice: 100,
        },
      ];
      expect(component.refundTotal()).toBe(60); // 2 * 30
    });
  });
});
