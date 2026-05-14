import { ComponentFixture, TestBed } from "@angular/core/testing";
import { HttpClientTestingModule } from "@angular/common/http/testing";
import { of, throwError } from "rxjs";
import { ProviderReceiptsComponent } from "./provider-receipts.component";
import { PurchaseReceiptService } from "../../../services/purchase-receipt.service";
import { ToastService } from "../../../services/toast.service";
import { ParsedInvoice, PurchaseReceipt } from "../../../models";

const mockReceipts: PurchaseReceipt[] = [
  {
    _id: "r1",
    provider: "prov1",
    originalFilename: "invoice.xlsx",
    fileType: "excel",
    parsedItems: [],
    totals: { subtotal: 100, tax: 16, total: 116 },
    status: "applied",
    createdAt: new Date().toISOString() as any,
  },
];

const mockParsedInvoice: ParsedInvoice = {
  items: [],
  totals: { subtotal: 50, tax: 0, total: 50 },
};

describe("ProviderReceiptsComponent", () => {
  let component: ProviderReceiptsComponent;
  let fixture: ComponentFixture<ProviderReceiptsComponent>;
  let mockReceiptService: jest.Mocked<Partial<PurchaseReceiptService>>;
  let mockToastService: jest.Mocked<Partial<ToastService>>;

  beforeEach(async () => {
    mockReceiptService = {
      getReceipts: jest
        .fn()
        .mockReturnValue(of({ data: mockReceipts, pagination: { total: 1 } })),
      getReceipt: jest.fn().mockReturnValue(of(mockReceipts[0])),
      deleteReceipt: jest.fn().mockReturnValue(of({ message: "Deleted" })),
    };
    mockToastService = { show: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [ProviderReceiptsComponent, HttpClientTestingModule],
      providers: [
        { provide: PurchaseReceiptService, useValue: mockReceiptService },
        { provide: ToastService, useValue: mockToastService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProviderReceiptsComponent);
    component = fixture.componentInstance;
    component.providerId = "prov1";
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should load receipts on init", () => {
    expect(mockReceiptService.getReceipts).toHaveBeenCalledWith("prov1", 1, 10);
    expect(component.receipts().length).toBe(1);
  });

  it("openScanner should set showScanner to true", () => {
    component.openScanner();
    expect(component.showScanner()).toBe(true);
  });

  it("onScanCancelled should hide scanner", () => {
    component.showScanner.set(true);
    component.onScanCancelled();
    expect(component.showScanner()).toBe(false);
  });

  it("onScanned should hide scanner and show review", () => {
    component.onScanned(mockParsedInvoice);
    expect(component.showScanner()).toBe(false);
    expect(component.showReview()).toBe(true);
    expect(component.parsedInvoice()).toEqual(mockParsedInvoice);
  });

  it("onReviewConfirmed should hide review and reload list", () => {
    component.showReview.set(true);
    const callsBefore = (mockReceiptService.getReceipts as jest.Mock).mock.calls
      .length;
    component.onReviewConfirmed();
    expect(component.showReview()).toBe(false);
    expect(
      (mockReceiptService.getReceipts as jest.Mock).mock.calls.length
    ).toBeGreaterThan(callsBefore);
  });

  it("onReviewCancelled should hide review", () => {
    component.showReview.set(true);
    component.onReviewCancelled();
    expect(component.showReview()).toBe(false);
  });

  it("viewReceipt should fetch full receipt and set selectedReceipt", () => {
    component.viewReceipt(mockReceipts[0]);
    expect(mockReceiptService.getReceipt).toHaveBeenCalledWith("r1");
    expect(component.selectedReceipt()).toEqual(mockReceipts[0]);
  });

  it("closeReceiptDetail should clear selectedReceipt", () => {
    component.selectedReceipt.set(mockReceipts[0]);
    component.closeReceiptDetail();
    expect(component.selectedReceipt()).toBeNull();
  });

  it("deleteReceipt should call service and reload", () => {
    const pendingReceipt: PurchaseReceipt = {
      ...mockReceipts[0],
      _id: "r2",
      status: "pending",
    };
    const event = { stopPropagation: jest.fn() } as unknown as Event;
    const callsBefore = (mockReceiptService.getReceipts as jest.Mock).mock.calls
      .length;
    component.deleteReceipt(pendingReceipt, event);
    expect(mockReceiptService.deleteReceipt).toHaveBeenCalledWith("r2");
    expect(
      (mockReceiptService.getReceipts as jest.Mock).mock.calls.length
    ).toBeGreaterThan(callsBefore);
    expect(mockToastService.show).toHaveBeenCalledWith(
      "PROVIDERS.INVOICES.ALERTS.DELETE_SUCCESS",
      "success"
    );
  });

  it("deleteReceipt should not call service for applied receipts", () => {
    const event = { stopPropagation: jest.fn() } as unknown as Event;
    // mockReceipts[0].status === 'applied', should be skipped
    component.deleteReceipt(mockReceipts[0], event);
    // Fires stopPropagation but service should NOT be called for applied
    expect(mockReceiptService.deleteReceipt).not.toHaveBeenCalled();
  });

  it("getFileTypeIcon should return correct icon class", () => {
    expect(component.getFileTypeIcon("pdf")).toBe("fa-file-pdf");
    expect(component.getFileTypeIcon("excel")).toBe("fa-file-excel");
    expect(component.getFileTypeIcon("camera")).toBe("fa-camera");
    expect(component.getFileTypeIcon("unknown")).toBe("fa-file");
  });
});
