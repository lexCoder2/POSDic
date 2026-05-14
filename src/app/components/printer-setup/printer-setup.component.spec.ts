import { ComponentFixture, TestBed } from "@angular/core/testing";
import { EMPTY, BehaviorSubject } from "rxjs";
import { PrinterSetupComponent } from "./printer-setup.component";
import {
  ReceiptPrinterService,
  PrinterStatus,
} from "../../services/receipt-printer.service";
import { ToastService } from "../../services/toast.service";
import { TranslationService } from "../../services/translation.service";

describe("PrinterSetupComponent", () => {
  let component: PrinterSetupComponent;
  let fixture: ComponentFixture<PrinterSetupComponent>;
  let printerSpy: any;
  let statusSubject: BehaviorSubject<PrinterStatus>;
  let toastSpy: any;

  beforeEach(async () => {
    statusSubject = new BehaviorSubject<PrinterStatus>("disconnected");
    printerSpy = {
      printerStatus$: statusSubject.asObservable(),
      printMode: "html",
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      getPrinters: jest.fn().mockResolvedValue(["Printer A", "Printer B"]),
      getDefaultPrinter: jest.fn().mockReturnValue(""),
      setDefaultPrinter: jest.fn(),
      printTestPage: jest.fn().mockResolvedValue(undefined),
    };
    toastSpy = { show: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [PrinterSetupComponent],
      providers: [
        { provide: ReceiptPrinterService, useValue: printerSpy },
        { provide: ToastService, useValue: toastSpy },
        {
          provide: TranslationService,
          useValue: {
            translate: jest.fn().mockReturnValue(""),
            translationsChanged$: EMPTY,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PrinterSetupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it("should be created", () => {
    expect(component).toBeTruthy();
  });

  it("should expose status signal reflecting printerStatus$", () => {
    expect(component.status()).toBe("disconnected");
    statusSubject.next("connected");
    fixture.detectChanges();
    expect(component.status()).toBe("connected");
  });

  it("should expose printers signal as empty initially", () => {
    expect(component.printers()).toEqual([]);
  });

  it("should expose selectedPrinter signal as empty string initially", () => {
    expect(component.selectedPrinter()).toBe("");
  });

  describe("connect()", () => {
    it("should call printerService.connect", async () => {
      await component.connect();
      expect(printerSpy.connect).toHaveBeenCalled();
    });

    it("should load printers after connect", async () => {
      await component.connect();
      expect(printerSpy.getPrinters).toHaveBeenCalled();
    });

    it("should show error toast on connection failure", async () => {
      printerSpy.connect.mockRejectedValue(new Error("Failed"));
      await component.connect();
      expect(toastSpy.show).toHaveBeenCalledWith(expect.any(String), "error");
    });
  });

  describe("disconnect()", () => {
    it("should call printerService.disconnect", async () => {
      await component.disconnect();
      expect(printerSpy.disconnect).toHaveBeenCalled();
    });

    it("should clear the printers list after disconnect", async () => {
      await component.connect(); // populate printers first
      await component.disconnect();
      expect(component.printers()).toEqual([]);
    });
  });

  describe("selectPrinter()", () => {
    it("should update selectedPrinter signal", () => {
      component.selectPrinter("Printer A");
      expect(component.selectedPrinter()).toBe("Printer A");
    });

    it("should call printerService.setDefaultPrinter", () => {
      component.selectPrinter("Printer A");
      expect(printerSpy.setDefaultPrinter).toHaveBeenCalledWith("Printer A");
    });
  });

  describe("printTest()", () => {
    it("should call printerService.printTestPage with selectedPrinter", async () => {
      component.selectPrinter("Printer A");
      await component.printTest();
      expect(printerSpy.printTestPage).toHaveBeenCalledWith("Printer A");
    });

    it("should show toast if no printer selected", async () => {
      await component.printTest();
      expect(toastSpy.show).toHaveBeenCalledWith(expect.any(String), "info");
    });
  });

  describe("loadPrinters()", () => {
    it("should populate printers signal from service", async () => {
      await component.loadPrinters();
      expect(component.printers()).toEqual(["Printer A", "Printer B"]);
    });
  });
});
