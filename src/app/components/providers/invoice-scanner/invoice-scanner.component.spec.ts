import { ComponentFixture, TestBed } from "@angular/core/testing";
import { HttpClientTestingModule } from "@angular/common/http/testing";
import { of, throwError } from "rxjs";
import { InvoiceScannerComponent } from "./invoice-scanner.component";
import { PurchaseReceiptService } from "../../../services/purchase-receipt.service";
import { ToastService } from "../../../services/toast.service";
import { ParsedInvoice } from "../../../models";

describe("InvoiceScannerComponent", () => {
  let component: InvoiceScannerComponent;
  let fixture: ComponentFixture<InvoiceScannerComponent>;
  let mockReceiptService: jest.Mocked<Partial<PurchaseReceiptService>>;
  let mockToastService: jest.Mocked<Partial<ToastService>>;

  const mockInvoice: ParsedInvoice = {
    items: [
      {
        description: "Product A",
        quantity: 2,
        unitCost: 10,
        total: 20,
        included: true,
      },
    ],
    totals: { subtotal: 20, tax: 0, total: 20 },
  };

  beforeEach(async () => {
    mockReceiptService = {
      parseFile: jest.fn().mockReturnValue(of(mockInvoice)),
    };
    mockToastService = {
      show: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [InvoiceScannerComponent, HttpClientTestingModule],
      providers: [
        { provide: PurchaseReceiptService, useValue: mockReceiptService },
        { provide: ToastService, useValue: mockToastService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InvoiceScannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should start with isLoading false", () => {
    expect(component.isLoading()).toBe(false);
  });

  it("should start with isDragging false", () => {
    expect(component.isDragging()).toBe(false);
  });

  it("should emit cancelled when closeModal() is called", () => {
    const spy = jest.fn();
    component.cancelled.subscribe(spy);
    component.closeModal();
    expect(spy).toHaveBeenCalled();
  });

  it("should not close modal when loading", () => {
    const spy = jest.fn();
    component.cancelled.subscribe(spy);
    component.isLoading.set(true);
    component.onOverlayClick();
    expect(spy).not.toHaveBeenCalled();
  });

  it("should set isDragging true on dragover", () => {
    const event = { preventDefault: jest.fn() } as unknown as DragEvent;
    component.onDragOver(event);
    expect(component.isDragging()).toBe(true);
  });

  it("should set isDragging false on dragleave", () => {
    component.isDragging.set(true);
    component.onDragLeave();
    expect(component.isDragging()).toBe(false);
  });

  it("should process file and emit scanned on success", () => {
    const scannedSpy = jest.fn();
    component.scanned.subscribe(scannedSpy);

    const file = new File(["data"], "invoice.xlsx");
    (component as any)._processFile(file);

    expect(mockReceiptService.parseFile).toHaveBeenCalledWith(file);
    expect(scannedSpy).toHaveBeenCalledWith(mockInvoice);
  });

  it("should show toast and not emit on parse error", () => {
    mockReceiptService.parseFile = jest
      .fn()
      .mockReturnValue(throwError(() => new Error("server error")));
    const scannedSpy = jest.fn();
    component.scanned.subscribe(scannedSpy);

    const file = new File(["data"], "bad.txt");
    (component as any)._processFile(file);

    expect(mockToastService.show).toHaveBeenCalled();
    expect(scannedSpy).not.toHaveBeenCalled();
  });

  it("should reset isLoading after parse completes", () => {
    const file = new File(["data"], "invoice.pdf");
    (component as any)._processFile(file);
    expect(component.isLoading()).toBe(false);
  });

  it("formatFileSize should format bytes correctly", () => {
    expect(component.formatFileSize(512)).toBe("512 B");
    expect(component.formatFileSize(2048)).toBe("2.0 KB");
    expect(component.formatFileSize(2 * 1024 * 1024)).toBe("2.0 MB");
  });
});
