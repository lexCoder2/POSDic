import { TestBed } from "@angular/core/testing";
import { EMPTY, of, throwError } from "rxjs";
import {
  ReceiptPrinterService,
  PrinterStatus,
} from "./receipt-printer.service";
import { QzTrayService } from "./qz-tray.service";
import { ReceiptGeneratorService } from "./receipt-generator.service";
import { EscPosService } from "./esc-pos.service";
import { ToastService } from "./toast.service";
import { TranslationService } from "./translation.service";

const mockSale: any = {
  _id: "sale1",
  saleNumber: 1,
  items: [
    {
      productName: "Bread",
      quantity: 1,
      unitPrice: 2.0,
      subtotal: 2.0,
      total: 2.0,
    },
  ],
  subtotal: 2.0,
  total: 2.0,
  paymentMethod: "cash",
  cashier: "cashier1",
};

describe("ReceiptPrinterService", () => {
  let service: ReceiptPrinterService;
  let qzSpy: any;
  let receiptGenSpy: any;
  let escPosSpy: any;
  let toastSpy: any;

  beforeEach(() => {
    qzSpy = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      isConnected: jest.fn().mockReturnValue(false),
      findPrinters: jest.fn().mockResolvedValue(["Printer A", "Printer B"]),
      print: jest.fn().mockResolvedValue(undefined),
      getDefaultPrinter: jest.fn().mockReturnValue("Printer A"),
      setDefaultPrinter: jest.fn(),
    };
    receiptGenSpy = {
      generateSaleReceipt: jest.fn().mockResolvedValue("<html>receipt</html>"),
    };
    escPosSpy = {
      generateReceiptText: jest
        .fn()
        .mockReturnValue("\x1B\x40receipt\x1D\x56\x00"),
      generateTestPage: jest.fn().mockReturnValue("\x1B\x40TEST\x1D\x56\x00"),
    };
    toastSpy = { show: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        ReceiptPrinterService,
        { provide: QzTrayService, useValue: qzSpy },
        { provide: ReceiptGeneratorService, useValue: receiptGenSpy },
        { provide: EscPosService, useValue: escPosSpy },
        { provide: ToastService, useValue: toastSpy },
        {
          provide: TranslationService,
          useValue: {
            translate: jest.fn().mockReturnValue(""),
            translationsChanged$: EMPTY,
          },
        },
      ],
    });
    service = TestBed.inject(ReceiptPrinterService);
  });

  afterEach(() => TestBed.resetTestingModule());

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  it("should expose printerStatus$ observable", () => {
    expect(service.printerStatus$).toBeDefined();
  });

  it("should start with disconnected status", (done) => {
    service.printerStatus$.subscribe((status) => {
      expect(status).toBe("disconnected");
      done();
    });
  });

  describe("connect()", () => {
    it("should call qzTrayService.connect and emit connected status", async () => {
      await service.connect();
      expect(qzSpy.connect).toHaveBeenCalled();
      let emittedStatus: PrinterStatus | undefined;
      service.printerStatus$.subscribe((s) => (emittedStatus = s));
      expect(emittedStatus).toBe("connected");
    });

    it("should emit error status when connection fails", async () => {
      qzSpy.connect.mockRejectedValue(new Error("QZ Tray not found"));
      await service.connect();
      let emittedStatus: PrinterStatus | undefined;
      service.printerStatus$.subscribe((s) => (emittedStatus = s));
      expect(emittedStatus).toBe("error");
    });
  });

  describe("getPrinters()", () => {
    it("should return list from qzTrayService", async () => {
      const printers = await service.getPrinters();
      expect(printers).toEqual(["Printer A", "Printer B"]);
    });
  });

  describe("getDefaultPrinter()", () => {
    it("should return default printer name", () => {
      const name = service.getDefaultPrinter();
      expect(name).toBe("Printer A");
    });
  });

  describe("setDefaultPrinter()", () => {
    it("should call qzTrayService.setDefaultPrinter", () => {
      service.setDefaultPrinter("Printer B");
      expect(qzSpy.setDefaultPrinter).toHaveBeenCalledWith("Printer B");
    });
  });

  describe("printSale()", () => {
    it("should use QZ Tray when connected", async () => {
      qzSpy.isConnected.mockReturnValue(true);
      await service.printSale(mockSale);
      expect(qzSpy.print).toHaveBeenCalled();
    });

    it("should use ESC/POS mode when printMode is escpos", async () => {
      qzSpy.isConnected.mockReturnValue(true);
      service.printMode = "escpos";
      await service.printSale(mockSale);
      expect(escPosSpy.generateReceiptText).toHaveBeenCalledWith(
        mockSale,
        expect.any(Object)
      );
      expect(qzSpy.print).toHaveBeenCalled();
    });

    it("should fall back to browser print when not connected", async () => {
      qzSpy.isConnected.mockReturnValue(false);
      const printWithBrowserSpy = jest
        .spyOn(service, "printWithBrowser")
        .mockImplementation(() => {});
      await service.printSale(mockSale);
      expect(printWithBrowserSpy).toHaveBeenCalled();
    });
  });

  describe("printTestPage()", () => {
    it("should print test content to given printer", async () => {
      qzSpy.isConnected.mockReturnValue(true);
      await service.printTestPage("Printer A");
      expect(qzSpy.print).toHaveBeenCalledWith(
        "Printer A",
        expect.any(String),
        expect.any(String)
      );
    });

    it("should show error toast when printer not connected", async () => {
      qzSpy.isConnected.mockReturnValue(false);
      await service.printTestPage("Printer A");
      expect(toastSpy.show).toHaveBeenCalledWith(expect.any(String), "error");
    });
  });

  describe("printWithBrowser()", () => {
    it("should open a browser print window", () => {
      const mockWin = {
        document: { write: jest.fn(), close: jest.fn() },
        focus: jest.fn(),
        print: jest.fn(),
        close: jest.fn(),
      };
      const openSpy = jest
        .spyOn(window, "open")
        .mockReturnValue(mockWin as any);
      service.printWithBrowser("<html><body>receipt</body></html>");
      expect(openSpy).toHaveBeenCalled();
    });
  });
});
