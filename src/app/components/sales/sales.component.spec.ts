import {
  TestBed,
  ComponentFixture,
  fakeAsync,
  tick,
} from "@angular/core/testing";
import { RouterTestingModule } from "@angular/router/testing";
import { of, throwError, Subject, BehaviorSubject } from "rxjs";
import { SalesComponent } from "./sales.component";
import { SaleService } from "../../services/sale.service";
import { AuthService } from "../../services/auth.service";
import { SearchStateService } from "../../services/search-state.service";
import { ReceiptGeneratorService } from "../../services/receipt-generator.service";
import { ToastService } from "../../services/toast.service";
import { Sale, User, PaginatedResponse } from "../../models";

const adminUser: User = {
  id: "u1",
  username: "admin",
  email: "a@a.com",
  firstName: "Admin",
  lastName: "User",
  role: "admin",
};

const mockSale = (
  id: string,
  method = "cash",
  status: "completed" | "cancelled" = "completed"
): Sale => ({
  _id: id,
  saleNumber: `SALE-${id.toUpperCase()}`,
  items: [
    {
      product: "p1" as any,
      productName: "Prod",
      quantity: 2,
      unitPrice: 5,
      subtotal: 10,
      total: 10,
    },
  ],
  subtotal: 10,
  taxTotal: 0,
  discountTotal: 0,
  total: 10,
  paymentMethod: method as any,
  cashier: adminUser,
  status,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const paginatedSales = (sales: Sale[]): PaginatedResponse<Sale> => ({
  data: sales,
  pagination: { total: sales.length, page: 1, pageSize: 10, totalPages: 1 },
});

describe("SalesComponent", () => {
  let component: SalesComponent;
  let fixture: ComponentFixture<SalesComponent>;
  let saleServiceSpy: any;
  let authServiceSpy: any;
  let searchStateServiceSpy: any;
  let receiptServiceSpy: any;
  let toastServiceSpy: any;
  let searchQuery$: BehaviorSubject<string>;

  beforeEach(async () => {
    searchQuery$ = new BehaviorSubject<string>("");

    saleServiceSpy = {
      getSales: jest.fn().mockReturnValue(of(paginatedSales([]))),
      cancelSale: jest.fn().mockReturnValue(of({ message: "Cancelled" })),
    };
    authServiceSpy = { getCurrentUser: jest.fn().mockReturnValue(adminUser) };
    searchStateServiceSpy = {
      clearSearch: jest.fn(),
      setSearchQuery: jest.fn(),
      searchQuery$: searchQuery$.asObservable(),
    } as any;
    receiptServiceSpy = {
      printSaleReceipt: jest.fn().mockResolvedValue(undefined),
    };
    toastServiceSpy = { show: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [SalesComponent, RouterTestingModule],
      providers: [
        { provide: SaleService, useValue: saleServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: SearchStateService, useValue: searchStateServiceSpy },
        { provide: ReceiptGeneratorService, useValue: receiptServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SalesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should set currentUser on init", () => {
    expect(component.currentUser).toEqual(adminUser);
  });

  it("should call getSales on init", () => {
    expect(saleServiceSpy.getSales).toHaveBeenCalled();
  });

  describe("isAdmin", () => {
    it("should return true for admin", () => {
      expect(component.isAdmin()).toBe(true);
    });

    it("should return false for cashier", () => {
      component.currentUser = { ...adminUser, role: "cashier" };
      expect(component.isAdmin()).toBe(false);
    });
  });

  describe("loadSales", () => {
    it("should populate sales signal", () => {
      const sales = [mockSale("1"), mockSale("2")];
      saleServiceSpy.getSales!.mockReturnValue(of(paginatedSales(sales)));
      component.loadSales();
      expect(component.sales()).toEqual(sales);
    });
  });

  describe("filteredSales computed", () => {
    beforeEach(() => {
      component.sales.set([
        mockSale("A0000001", "cash", "completed"),
        mockSale("A0000002", "card", "cancelled"),
      ]);
    });

    it("should return all sales when query empty", () => {
      component.searchQuery.set("");
      expect(component.filteredSales().length).toBe(2);
    });

    it("should filter by saleNumber", () => {
      component.searchQuery.set("A0000001");
      expect(component.filteredSales().length).toBe(1);
    });

    it("should filter by payment method", () => {
      component.searchQuery.set("card");
      expect(component.filteredSales().length).toBe(1);
    });

    it("should filter by status", () => {
      component.searchQuery.set("cancelled");
      expect(component.filteredSales().length).toBe(1);
    });
  });

  describe("calculateSummary", () => {
    it("should compute totalRevenue and averageSale correctly", () => {
      component.sales.set([mockSale("1"), mockSale("2")]);
      component.searchQuery.set("");
      component.calculateSummary();
      expect(component.summary.totalRevenue).toBe(20);
      expect(component.summary.averageSale).toBe(10);
    });

    it("should not divide by zero with empty list", () => {
      component.sales.set([]);
      component.calculateSummary();
      expect(component.summary.averageSale).toBe(0);
    });
  });

  describe("getTotalItems", () => {
    it("should sum item quantities in a sale", () => {
      const sale = mockSale("1");
      expect(component.getTotalItems(sale)).toBe(2);
    });
  });

  describe("getCashierName", () => {
    it("should return string cashier directly", () => {
      expect(component.getCashierName("cashier-string")).toBe("cashier-string");
    });

    it("should return full name for User object", () => {
      expect(component.getCashierName(adminUser)).toBe("Admin User");
    });

    it("should return username when no first/last name", () => {
      const u = { ...adminUser, firstName: "", lastName: "" };
      expect(component.getCashierName(u)).toBe("admin");
    });
  });

  describe("viewSale", () => {
    it("should set selectedSale and show modal", () => {
      const sale = mockSale("x");
      component.viewSale(sale);
      expect(component.selectedSale).toEqual(sale);
      expect(component.showSaleModal).toBe(true);
    });
  });

  describe("printReceipt", () => {
    it("should call printSaleReceipt", async () => {
      await component.printReceipt(mockSale("1"));
      expect(receiptServiceSpy.printSaleReceipt).toHaveBeenCalled();
    });

    it("should show error toast when printing fails", async () => {
      receiptServiceSpy.printSaleReceipt!.mockRejectedValue(
        new Error("print fail")
      );
      await component.printReceipt(mockSale("1"));
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.stringContaining("print"),
        "error"
      );
    });
  });

  describe("pagination", () => {
    beforeEach(() => {
      component.sales.set(
        Array.from({ length: 25 }, (_, i) => mockSale(`${i}`))
      );
      component.pageSize.set(10);
      component.currentPage.set(1);
    });

    it("should paginate correctly on nextPage()", () => {
      component.nextPage();
      expect(component.currentPage()).toBe(2);
    });

    it("should not go past last page", () => {
      component.currentPage.set(component.totalPages());
      component.nextPage();
      expect(component.currentPage()).toBe(component.totalPages());
    });

    it("should go back on prevPage()", () => {
      component.currentPage.set(2);
      component.prevPage();
      expect(component.currentPage()).toBe(1);
    });
  });

  describe("search state subscription", () => {
    it("should update searchQuery signal when service emits", () => {
      searchQuery$.next("searchterm");
      expect(component.searchQuery()).toBe("searchterm");
    });
  });

  describe("ngOnDestroy", () => {
    it("should call clearSearch on destroy", () => {
      component.ngOnDestroy();
      expect(searchStateServiceSpy.clearSearch).toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────
  // loadSales with filters
  // ──────────────────────────────────────────────

  describe("loadSales with filters", () => {
    it("passes status filter to getSales", () => {
      component.filters.status = "completed";
      component.loadSales();
      expect(saleServiceSpy.getSales).toHaveBeenCalledWith(
        expect.objectContaining({ status: "completed" })
      );
    });

    it("passes date range filters", () => {
      component.filters.startDate = "2024-01-01";
      component.filters.endDate = "2024-12-31";
      component.loadSales();
      expect(saleServiceSpy.getSales).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: "2024-01-01",
          endDate: "2024-12-31",
        })
      );
    });

    it("logs error when getSales fails", () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      saleServiceSpy.getSales.mockReturnValue(
        throwError(() => new Error("fail"))
      );
      component.loadSales();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  // ──────────────────────────────────────────────
  // getProductName
  // ──────────────────────────────────────────────

  describe("getProductName", () => {
    it("returns string product directly", () => {
      expect(component.getProductName("prod-id")).toBe("prod-id");
    });

    it("returns product.name for object", () => {
      expect(component.getProductName({ name: "Apple", _id: "x" })).toBe(
        "Apple"
      );
    });

    it("returns Unknown Product for null", () => {
      expect(component.getProductName(null)).toBe("Unknown Product");
    });
  });

  // ──────────────────────────────────────────────
  // Pagination helpers
  // ──────────────────────────────────────────────

  describe("goToPage()", () => {
    beforeEach(() => {
      component.sales.set(
        Array.from({ length: 25 }, (_, i) => mockSale(`${i}`))
      );
      component.pageSize.set(10);
    });

    it("navigates to a valid page", () => {
      component.goToPage(2);
      expect(component.currentPage()).toBe(2);
    });

    it("ignores page 0", () => {
      component.currentPage.set(1);
      component.goToPage(0);
      expect(component.currentPage()).toBe(1);
    });

    it("ignores page beyond totalPages", () => {
      component.currentPage.set(1);
      component.goToPage(100);
      expect(component.currentPage()).toBe(1);
    });
  });

  describe("changePageSize()", () => {
    it("updates pageSize and resets to page 1", () => {
      component.sales.set(
        Array.from({ length: 25 }, (_, i) => mockSale(`${i}`))
      );
      component.currentPage.set(3);
      component.changePageSize(5);
      expect(component.pageSize()).toBe(5);
      expect(component.currentPage()).toBe(1);
    });
  });

  describe("prevPage()", () => {
    it("does not go below page 1", () => {
      component.currentPage.set(1);
      component.prevPage();
      expect(component.currentPage()).toBe(1);
    });
  });

  describe("getVisiblePages()", () => {
    it("returns all pages when total <= 7", () => {
      component.sales.set(
        Array.from({ length: 5 }, (_, i) => mockSale(`${i}`))
      );
      component.pageSize.set(1);
      const pages = component.getVisiblePages();
      expect(pages).toEqual([1, 2, 3, 4, 5]);
    });

    it("returns ellipsis for large page sets", () => {
      component.sales.set(
        Array.from({ length: 100 }, (_, i) => mockSale(`${i}`))
      );
      component.pageSize.set(1);
      component.currentPage.set(50);
      const pages = component.getVisiblePages();
      expect(pages).toContain(-1); // ellipsis marker
    });
  });

  // ──────────────────────────────────────────────
  // cancelSale
  // ──────────────────────────────────────────────

  describe("cancelSale()", () => {
    it("shows error when not admin", () => {
      component.currentUser = { ...adminUser, role: "cashier" };
      component.cancelSale("s1");
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.stringContaining("administrators"),
        "error"
      );
    });

    it("does nothing when no reason is provided", () => {
      global.prompt = jest.fn().mockReturnValue(null);
      component.cancelSale("s1");
      expect(saleServiceSpy.cancelSale).not.toHaveBeenCalled();
    });

    it("calls cancelSale and updates sales on success", () => {
      const sale = mockSale("s1");
      component.sales.set([sale]);
      global.prompt = jest.fn().mockReturnValue("Mistake");
      saleServiceSpy.cancelSale.mockReturnValue(
        of({ ...sale, _id: "s1", status: "cancelled" })
      );
      component.cancelSale("s1");
      expect(saleServiceSpy.cancelSale).toHaveBeenCalledWith("s1", "Mistake");
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        "Sale cancelled successfully",
        "success"
      );
    });

    it("shows error toast on cancelSale failure", () => {
      global.prompt = jest.fn().mockReturnValue("reason");
      saleServiceSpy.cancelSale.mockReturnValue(
        throwError(() => new Error("fail"))
      );
      component.cancelSale("s1");
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        "Failed to cancel sale",
        "error"
      );
    });
  });

  // ──────────────────────────────────────────────
  // openRefundModal / onRefundTypeChange / updateRefundTotal
  // ──────────────────────────────────────────────

  describe("openRefundModal()", () => {
    it("shows error when not admin", () => {
      component.currentUser = { ...adminUser, role: "cashier" };
      component.openRefundModal(mockSale("x"));
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.stringContaining("administrators"),
        "error"
      );
      expect(component.showRefundModal).toBe(false);
    });

    it("opens modal and initializes refundItems", () => {
      const sale = mockSale("x");
      component.openRefundModal(sale);
      expect(component.showRefundModal).toBe(true);
      expect(component.selectedSaleForRefund).toBe(sale);
      expect(component.refundItems.length).toBe(1);
      expect(component.refundItems[0].selected).toBe(false);
    });
  });

  describe("onRefundTypeChange()", () => {
    it("resets selections when switching to full refund", () => {
      component.refundItems = [{ itemId: "i1", quantity: 2, selected: true }];
      component.refundTotal = 5;
      component.refundType = "full";
      component.onRefundTypeChange();
      expect(component.refundItems[0].selected).toBe(false);
      expect(component.refundTotal).toBe(0);
    });

    it("does not reset when switching to partial", () => {
      component.refundItems = [{ itemId: "i1", quantity: 2, selected: true }];
      component.refundType = "partial";
      component.onRefundTypeChange();
      expect(component.refundItems[0].selected).toBe(true);
    });
  });

  describe("updateRefundTotal()", () => {
    it("sets 0 when no selectedSaleForRefund", () => {
      component.selectedSaleForRefund = null;
      component.updateRefundTotal();
      expect(component.refundTotal).toBe(0);
    });

    it("calculates total for selected items", () => {
      const sale: any = {
        ...mockSale("t"),
        items: [
          {
            product: "p1",
            quantity: 2,
            unitPrice: 5,
            discountAmount: 2,
            subtotal: 8,
            total: 8,
          },
        ],
      };
      component.selectedSaleForRefund = sale;
      component.refundItems = [{ itemId: "i1", quantity: 2, selected: true }];
      component.updateRefundTotal();
      // 2 * 5 = 10; discountPortion = 2 * (2/2) = 2; total = 8
      expect(component.refundTotal).toBeCloseTo(8);
    });
  });

  describe("hasSelectedItems()", () => {
    it("returns false when none selected", () => {
      component.refundItems = [{ itemId: "i1", quantity: 1, selected: false }];
      expect(component.hasSelectedItems()).toBe(false);
    });

    it("returns true when at least one selected", () => {
      component.refundItems = [{ itemId: "i1", quantity: 1, selected: true }];
      expect(component.hasSelectedItems()).toBe(true);
    });
  });

  // ──────────────────────────────────────────────
  // processRefund
  // ──────────────────────────────────────────────

  describe("processRefund()", () => {
    const sale = mockSale("r1");

    beforeEach(() => {
      saleServiceSpy.refundSale = jest.fn().mockReturnValue(of({ ...sale }));
      component.selectedSaleForRefund = sale;
      component.refundReason = "damaged";
      component.refundType = "full";
      component.sales.set([sale]);
      component.refundItems = [{ itemId: "i1", quantity: 1, selected: false }];
    });

    it("shows toast when no reason", () => {
      component.refundReason = "";
      component.processRefund();
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.stringContaining("reason"),
        "info"
      );
    });

    it("shows toast when partial with no items selected", () => {
      component.refundType = "partial";
      component.refundItems = [{ itemId: "i1", quantity: 1, selected: false }];
      component.processRefund();
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.stringContaining("select at least"),
        "info"
      );
    });

    it("processes full refund and shows success toast", () => {
      component.processRefund();
      expect(saleServiceSpy.refundSale).toHaveBeenCalledWith(
        "r1",
        "full",
        "damaged",
        undefined
      );
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.stringContaining("Full"),
        "success"
      );
      expect(component.showRefundModal).toBe(false);
    });

    it("processes partial refund with items", () => {
      component.refundType = "partial";
      component.refundItems = [{ itemId: "i1", quantity: 1, selected: true }];
      component.processRefund();
      expect(saleServiceSpy.refundSale).toHaveBeenCalledWith(
        "r1",
        "partial",
        "damaged",
        [{ itemId: "i1", quantity: 1 }]
      );
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.stringContaining("Partial"),
        "success"
      );
    });

    it("shows error toast on refund failure", () => {
      saleServiceSpy.refundSale.mockReturnValue(
        throwError(() => ({ error: { message: "Refund denied" } }))
      );
      component.processRefund();
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        "Refund denied",
        "error"
      );
    });
  });
});
