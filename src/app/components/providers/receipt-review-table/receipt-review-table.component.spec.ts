import { ComponentFixture, TestBed } from "@angular/core/testing";
import { HttpClientTestingModule } from "@angular/common/http/testing";
import { of, throwError } from "rxjs";
import { ReceiptReviewTableComponent } from "./receipt-review-table.component";
import { ProductService } from "../../../services/product.service";
import { PurchaseReceiptService } from "../../../services/purchase-receipt.service";
import { ToastService } from "../../../services/toast.service";
import { ParsedInvoice, Product } from "../../../models";

const mockProduct: Product = {
  _id: "prod1",
  name: "Test Product",
  sku: "SKU-001",
  barcode: "1234567890",
  price: 15,
  stock: 10,
  cost: 8,
  active: true,
  available: true,
} as unknown as Product;

const mockInvoice: ParsedInvoice = {
  items: [
    {
      description: "Test Product",
      barcode: "1234567890",
      quantity: 5,
      unitCost: 8,
      total: 40,
      included: true,
    },
    {
      description: "Unknown Item",
      quantity: 2,
      unitCost: 3,
      total: 6,
      included: true,
    },
  ],
  totals: { subtotal: 46, tax: 0, total: 46 },
};

describe("ReceiptReviewTableComponent", () => {
  let component: ReceiptReviewTableComponent;
  let fixture: ComponentFixture<ReceiptReviewTableComponent>;
  let mockProductService: jest.Mocked<Partial<ProductService>>;
  let mockReceiptService: jest.Mocked<Partial<PurchaseReceiptService>>;
  let mockToastService: jest.Mocked<Partial<ToastService>>;

  beforeEach(async () => {
    mockProductService = {
      getProductByBarcode: jest.fn().mockReturnValue(of(mockProduct)),
      searchProducts: jest.fn().mockReturnValue(of([])),
    };
    mockReceiptService = {
      saveAndApply: jest
        .fn()
        .mockReturnValue(of({ _id: "r1", status: "applied" })),
    };
    mockToastService = { show: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [ReceiptReviewTableComponent, HttpClientTestingModule],
      providers: [
        { provide: ProductService, useValue: mockProductService },
        { provide: PurchaseReceiptService, useValue: mockReceiptService },
        { provide: ToastService, useValue: mockToastService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReceiptReviewTableComponent);
    component = fixture.componentInstance;
    component.parsedInvoice = mockInvoice;
    component.providerId = "prov1";
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should initialize rows from parsedInvoice.items", () => {
    expect(component.rows().length).toBe(2);
  });

  it("should default all rows to included=true", () => {
    expect(component.rows().every((r) => r.included)).toBe(true);
  });

  it("selectedCount should reflect included rows", () => {
    expect(component.selectedCount()).toBe(2);
  });

  it("should auto-match first row by barcode", () => {
    expect(mockProductService.getProductByBarcode).toHaveBeenCalledWith(
      "1234567890"
    );
  });

  it("toggleIncluded should toggle the included flag", () => {
    component.toggleIncluded(0);
    expect(component.rows()[0].included).toBe(false);
    expect(component.selectedCount()).toBe(1);
  });

  it("toggleCreateNew should set createNew and clear matchedProduct", () => {
    component.toggleCreateNew(0);
    expect(component.rows()[0].createNew).toBe(true);
    expect(component.rows()[0].matchedProduct).toBeNull();
  });

  it("selectProduct should set matchedProduct and hide dropdown", () => {
    component.selectProduct(0, mockProduct);
    const row = component.rows()[0];
    expect(row.matchedProduct).toEqual(mockProduct);
    expect(row.showDropdown).toBe(false);
  });

  it("clearMatch should remove matched product", () => {
    component.selectProduct(0, mockProduct);
    component.clearMatch(0);
    expect(component.rows()[0].matchedProduct).toBeNull();
  });

  it("updateField should update quantity and recalculate total", () => {
    component.updateField(0, "quantity", "10");
    const row = component.rows()[0];
    expect(row.quantity).toBe(10);
    expect(row.total).toBe(10 * row.unitCost);
  });

  it("confirmAndApply should show warning when no rows included", () => {
    component.toggleIncluded(0);
    component.toggleIncluded(1);
    component.confirmAndApply();
    expect(mockToastService.show).toHaveBeenCalledWith(
      "PROVIDERS.INVOICES.ALERTS.NO_ITEMS",
      "info"
    );
    expect(mockReceiptService.saveAndApply).not.toHaveBeenCalled();
  });

  it("confirmAndApply should call saveAndApply and emit confirmed", () => {
    const emitSpy = jest.fn();
    component.confirmed.subscribe(emitSpy);

    component.confirmAndApply();

    expect(mockReceiptService.saveAndApply).toHaveBeenCalled();
    expect(emitSpy).toHaveBeenCalled();
    expect(mockToastService.show).toHaveBeenCalledWith(
      "PROVIDERS.INVOICES.ALERTS.APPLY_SUCCESS",
      "success"
    );
  });

  it("confirmAndApply should show error toast on failure", () => {
    mockReceiptService.saveAndApply = jest
      .fn()
      .mockReturnValue(throwError(() => new Error("fail")));
    component.confirmAndApply();
    expect(mockToastService.show).toHaveBeenCalledWith(
      "PROVIDERS.INVOICES.ALERTS.APPLY_ERROR",
      "error"
    );
  });

  it("cancel() should emit cancelled", () => {
    const spy = jest.fn();
    component.cancelled.subscribe(spy);
    component.cancel();
    expect(spy).toHaveBeenCalled();
  });

  it("readOnly mode: confirmAndApply emits without calling saveAndApply", () => {
    component.readOnly = true;
    const emitSpy = jest.fn();
    component.confirmed.subscribe(emitSpy);

    component.confirmAndApply();

    expect(mockReceiptService.saveAndApply).not.toHaveBeenCalled();
    expect(emitSpy).toHaveBeenCalled();
  });
});
