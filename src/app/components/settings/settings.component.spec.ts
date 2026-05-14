import { TestBed, ComponentFixture } from "@angular/core/testing";
import { RouterTestingModule } from "@angular/router/testing";
import { of, throwError, EMPTY } from "rxjs";
import { SettingsComponent } from "./settings.component";
import { AuthService } from "../../services/auth.service";
import { UserService } from "../../services/user.service";
import { ToastService } from "../../services/toast.service";
import { TranslationService } from "../../services/translation.service";
import { CurrencyService } from "../../services/currency.service";
import { QzTrayService } from "../../services/qz-tray.service";
import { ScaleService } from "../../services/scale.service";
import { ReceiptGeneratorService } from "../../services/receipt-generator.service";
import { SettingsService } from "../../services/settings.service";
import { User } from "../../models";

const adminUser: User = {
  id: "u1",
  username: "admin",
  email: "admin@test.com",
  firstName: "Admin",
  lastName: "User",
  role: "admin",
};

const cashierUser: User = { ...adminUser, role: "cashier" };

describe("SettingsComponent", () => {
  let component: SettingsComponent;
  let fixture: ComponentFixture<SettingsComponent>;
  let authServiceSpy: any;
  let userServiceSpy: any;
  let toastServiceSpy: any;
  let translationServiceSpy: any;
  let currencyServiceSpy: any;
  let qzTrayServiceSpy: any;
  let scaleServiceSpy: any;
  let receiptGenSpy: any;
  let settingsServiceSpy: any;

  const defaultUserSettings = {
    displayName: "Test User",
    language: "en",
    printerMode: "inherit",
    currency: "USD",
  };

  beforeEach(async () => {
    authServiceSpy = { getCurrentUser: jest.fn().mockReturnValue(adminUser) };
    userServiceSpy = {
      getUserSettings: jest.fn().mockReturnValue(of(defaultUserSettings)),
      updateUserSettings: jest.fn().mockReturnValue(of({ ...adminUser })),
    };
    toastServiceSpy = { show: jest.fn() };
    translationServiceSpy = {
      translate: jest.fn().mockReturnValue(""),
      setLanguage: jest.fn(),
      translationsChanged$: EMPTY,
      current: "en",
    };
    currencyServiceSpy = {
      getCode: jest.fn().mockReturnValue("USD"),
      setCurrency: jest.fn(),
    };
    qzTrayServiceSpy = {
      findPrinters: jest.fn().mockResolvedValue(["default", "Printer1"]),
      getOptimalPaperWidth: jest.fn().mockReturnValue(80),
      getOptimalDpi: jest.fn().mockReturnValue(203),
      print: jest.fn().mockResolvedValue(undefined),
    };
    scaleServiceSpy = {
      isConnected: jest.fn().mockReturnValue(false),
      connectScale: jest.fn().mockResolvedValue(undefined),
      disconnectScale: jest.fn().mockResolvedValue(undefined),
      currentWeight$: EMPTY,
    };
    receiptGenSpy = {
      generateSaleReceipt: jest.fn().mockResolvedValue("<html></html>"),
    };
    settingsServiceSpy = {
      loadSettings: jest.fn().mockReturnValue(
        of({
          estimatedCostEnabled: false,
          estimatedCostMarginPercent: 30,
          sellMode: "combined",
        })
      ),
      updateSettings: jest.fn().mockReturnValue(
        of({
          estimatedCostEnabled: true,
          estimatedCostMarginPercent: 25,
          sellMode: "split",
        })
      ),
    };

    await TestBed.configureTestingModule({
      imports: [SettingsComponent, RouterTestingModule],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: UserService, useValue: userServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
        { provide: TranslationService, useValue: translationServiceSpy },
        { provide: CurrencyService, useValue: currencyServiceSpy },
        { provide: QzTrayService, useValue: qzTrayServiceSpy },
        { provide: ScaleService, useValue: scaleServiceSpy },
        { provide: ReceiptGeneratorService, useValue: receiptGenSpy },
        { provide: SettingsService, useValue: settingsServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  describe("isAdmin getter", () => {
    it("should return true for admin user", () => {
      authServiceSpy.getCurrentUser.mockReturnValue(adminUser);
      expect(component.isAdmin).toBe(true);
    });

    it("should return false for cashier", () => {
      authServiceSpy.getCurrentUser.mockReturnValue(cashierUser);
      expect(component.isAdmin).toBe(false);
    });

    it("should return false when no user", () => {
      authServiceSpy.getCurrentUser.mockReturnValue(null);
      expect(component.isAdmin).toBe(false);
    });
  });

  describe("ngOnInit", () => {
    it("should call getUserSettings on init", () => {
      expect(userServiceSpy.getUserSettings).toHaveBeenCalled();
    });

    it("should apply display name from user settings", () => {
      expect(component.displayName).toBe("Test User");
    });

    it("should apply language from user settings", () => {
      expect(component.preferredLang).toBe("en");
    });

    it("should apply selected currency from user settings", () => {
      expect(component.selectedCurrency).toBe("USD");
    });

    it("should handle getUserSettings error gracefully", async () => {
      userServiceSpy.getUserSettings.mockReturnValue(
        throwError(() => new Error("fail"))
      );
      // Recreate component with failing service
      await TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [SettingsComponent, RouterTestingModule],
        providers: [
          { provide: AuthService, useValue: authServiceSpy },
          { provide: UserService, useValue: userServiceSpy },
          { provide: ToastService, useValue: toastServiceSpy },
          { provide: TranslationService, useValue: translationServiceSpy },
          { provide: CurrencyService, useValue: currencyServiceSpy },
          { provide: QzTrayService, useValue: qzTrayServiceSpy },
          { provide: ScaleService, useValue: scaleServiceSpy },
          { provide: ReceiptGeneratorService, useValue: receiptGenSpy },
        ],
      }).compileComponents();
      const f = TestBed.createComponent(SettingsComponent);
      const c = f.componentInstance;
      f.detectChanges();
      // Fallback values applied — no crash
      expect(c.preferredLang).toBe("en");
      expect(c.selectedCurrency).toBe("USD");
    });

    it("should check scale connection status on init", () => {
      expect(scaleServiceSpy.isConnected).toHaveBeenCalled();
      expect(component.scaleConnected).toBe(false);
    });

    it("should apply sellMode from app settings", () => {
      expect(component.sellMode).toBe("combined");
    });
  });

  describe("saveSellModeSettings", () => {
    it("should update sellMode and show success toast", () => {
      component.sellMode = "split";

      component.saveSellModeSettings();

      expect(settingsServiceSpy.updateSettings).toHaveBeenCalledWith({
        sellMode: "split",
      });
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.any(String),
        "success"
      );
    });

    it("should show error toast when sellMode save fails", () => {
      settingsServiceSpy.updateSettings.mockReturnValue(
        throwError(() => new Error("fail"))
      );

      component.saveSellModeSettings();

      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.any(String),
        "error"
      );
    });
  });

  describe("localStorage-backed printer settings", () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it("should load printerMode from localStorage on init", async () => {
      localStorage.setItem("printer.mode", "styled");
      await TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [SettingsComponent, RouterTestingModule],
        providers: [
          { provide: AuthService, useValue: authServiceSpy },
          { provide: UserService, useValue: userServiceSpy },
          { provide: ToastService, useValue: toastServiceSpy },
          { provide: TranslationService, useValue: translationServiceSpy },
          { provide: CurrencyService, useValue: currencyServiceSpy },
          { provide: QzTrayService, useValue: qzTrayServiceSpy },
          { provide: ScaleService, useValue: scaleServiceSpy },
          { provide: ReceiptGeneratorService, useValue: receiptGenSpy },
        ],
      }).compileComponents();
      const f = TestBed.createComponent(SettingsComponent);
      f.detectChanges();
      expect(f.componentInstance.printerMode).toBe("styled");
    });

    it("setPrinterMode should update printerMode and save to localStorage", () => {
      component.setPrinterMode("styled");
      expect(component.printerMode).toBe("styled");
      expect(localStorage.getItem("printer.mode")).toBe("styled");
    });

    it("togglePrintPreview should update showPrintPreview and save to localStorage", () => {
      component.togglePrintPreview(true);
      expect(component.showPrintPreview).toBe(true);
      expect(localStorage.getItem("printer.showPreview")).toBe("true");
    });

    it("onDefaultPrinterChange should save defaultPrinter to localStorage", () => {
      component.defaultPrinter = "Printer1";
      component.onDefaultPrinterChange();
      expect(localStorage.getItem("printer.default")).toBe("Printer1");
    });
  });

  describe("saveUserSettings", () => {
    it("should call updateUserSettings and show success toast", () => {
      userServiceSpy.updateUserSettings.mockReturnValue(of(adminUser));
      component.saveUserSettings();
      expect(userServiceSpy.updateUserSettings).toHaveBeenCalled();
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.any(String),
        "success"
      );
    });

    it("should show error toast on save failure", () => {
      userServiceSpy.updateUserSettings.mockReturnValue(
        throwError(() => new Error("fail"))
      );
      component.saveUserSettings();
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.any(String),
        "error"
      );
    });

    it("should apply language immediately on success", () => {
      userServiceSpy.updateUserSettings.mockReturnValue(of(adminUser));
      component.preferredLang = "es";
      component.saveUserSettings();
      expect(translationServiceSpy.setLanguage).toHaveBeenCalledWith("es");
    });

    it("should apply currency immediately on success", () => {
      userServiceSpy.updateUserSettings.mockReturnValue(of(adminUser));
      component.selectedCurrency = "EUR";
      component.saveUserSettings();
      expect(currencyServiceSpy.setCurrency).toHaveBeenCalledWith("EUR");
    });
  });

  describe("toggleResetDBConfirm", () => {
    it("should show the reset DB confirmation section", () => {
      component.showResetDBConfirm = false;
      component.toggleResetDBConfirm();
      expect(component.showResetDBConfirm).toBe(true);
    });

    it("should hide the reset DB confirmation section", () => {
      component.showResetDBConfirm = true;
      component.toggleResetDBConfirm();
      expect(component.showResetDBConfirm).toBe(false);
    });

    it("should clear resetConfirmationText on toggle", () => {
      component.resetConfirmationText = "confirm";
      component.toggleResetDBConfirm();
      expect(component.resetConfirmationText).toBe("");
    });
  });

  describe("resetDatabase", () => {
    it("should show error when confirmation text is invalid", async () => {
      component.resetConfirmationText = "wrong";
      await component.resetDatabase();
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.any(String),
        "error"
      );
    });

    it("should show error when user is not admin", async () => {
      authServiceSpy.getCurrentUser.mockReturnValue(cashierUser);
      component.resetConfirmationText = "confirm";
      await component.resetDatabase();
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.any(String),
        "error"
      );
    });

    it("should show success toast on successful reset", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });
      component.resetConfirmationText = "confirm";
      await component.resetDatabase();
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.any(String),
        "success"
      );
      expect(component.showResetDBConfirm).toBe(false);
    });

    it("should show error when response is not ok", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ message: "DB error" }),
      });
      component.resetConfirmationText = "confirm";
      await component.resetDatabase();
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.any(String),
        "error"
      );
    });

    it("should show error when fetch throws", async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error("Network error"));
      component.resetConfirmationText = "confirm";
      await component.resetDatabase();
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.any(String),
        "error"
      );
    });
  });

  describe("connectScale", () => {
    it("should set scaleConnected and show success toast when connected", async () => {
      scaleServiceSpy.connectScale.mockResolvedValue(true);
      scaleServiceSpy.currentWeight$ = of({
        weight: 1.5,
        unit: "kg",
        stable: true,
      });
      await component.connectScale();
      expect(component.scaleConnected).toBe(true);
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.any(String),
        "success"
      );
    });

    it("should show error toast when connected returns false", async () => {
      scaleServiceSpy.connectScale.mockResolvedValue(false);
      await component.connectScale();
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.any(String),
        "error"
      );
    });

    it("should show error toast when connectScale throws", async () => {
      scaleServiceSpy.connectScale.mockRejectedValue(new Error("port error"));
      await component.connectScale();
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.any(String),
        "error"
      );
    });
  });

  describe("disconnectScale", () => {
    it("should disconnect and show info toast", async () => {
      await component.disconnectScale();
      expect(scaleServiceSpy.disconnectScale).toHaveBeenCalledWith(true);
      expect(component.scaleConnected).toBe(false);
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.any(String),
        "info"
      );
    });

    it("should show error toast when disconnectScale throws", async () => {
      scaleServiceSpy.disconnectScale.mockRejectedValue(
        new Error("disconnect error")
      );
      await component.disconnectScale();
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.any(String),
        "error"
      );
    });
  });

  describe("previewReceipt", () => {
    it("should open preview window with receipt HTML", async () => {
      receiptGenSpy.generateSaleReceipt.mockResolvedValue(
        "<html>receipt</html>"
      );
      const mockWindow = { document: { write: jest.fn(), close: jest.fn() } };
      jest.spyOn(window, "open").mockReturnValue(mockWindow as any);
      await component.previewReceipt();
      expect(mockWindow.document.write).toHaveBeenCalledWith(
        "<html>receipt</html>"
      );
    });

    it("should not write if window.open returns null", async () => {
      receiptGenSpy.generateSaleReceipt.mockResolvedValue(
        "<html>receipt</html>"
      );
      jest.spyOn(window, "open").mockReturnValue(null);
      await expect(component.previewReceipt()).resolves.not.toThrow();
    });

    it("should show error toast when receipt generation fails", async () => {
      receiptGenSpy.generateSaleReceipt.mockRejectedValue(
        new Error("gen error")
      );
      jest.spyOn(window, "open").mockReturnValue(null);
      await component.previewReceipt();
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.any(String),
        "error"
      );
    });
  });

  describe("printQrBadge", () => {
    it("should show error toast and return when no user", () => {
      authServiceSpy.getCurrentUser.mockReturnValue(null);
      const callsBefore = qzTrayServiceSpy.findPrinters.mock.calls.length;
      component.printQrBadge();
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.any(String),
        "error"
      );
      // findPrinters should not have been called again (only counted from ngOnInit)
      expect(qzTrayServiceSpy.findPrinters.mock.calls.length).toBe(callsBefore);
    });

    it("should set printingBadge to true and call printViaQzTray when user exists", () => {
      const spyVia = jest
        .spyOn(component as any, "printViaQzTray")
        .mockResolvedValue(undefined);
      component.printQrBadge();
      expect(component.printingBadge).toBe(true);
      expect(spyVia).toHaveBeenCalled();
    });
  });

  describe("printViaQzTray", () => {
    it("should show success toast when printers are available and print succeeds", async () => {
      qzTrayServiceSpy.print.mockResolvedValue(undefined);
      await (component as any).printViaQzTray(
        "<html>badge</html>",
        "Test User"
      );
      expect(qzTrayServiceSpy.print).toHaveBeenCalled();
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.any(String),
        "success"
      );
    });

    it("should fallback to browser print when no printers found", async () => {
      qzTrayServiceSpy.findPrinters.mockResolvedValue([]);
      const browserSpy = jest
        .spyOn(component as any, "printViaBrowser")
        .mockImplementation(() => {});
      await (component as any).printViaQzTray(
        "<html>badge</html>",
        "Test User"
      );
      expect(browserSpy).toHaveBeenCalled();
    });

    it("should fallback to browser print when qzTray throws", async () => {
      qzTrayServiceSpy.findPrinters.mockRejectedValue(new Error("QZ error"));
      const browserSpy = jest
        .spyOn(component as any, "printViaBrowser")
        .mockImplementation(() => {});
      await (component as any).printViaQzTray(
        "<html>badge</html>",
        "Test User"
      );
      expect(browserSpy).toHaveBeenCalled();
    });
  });

  describe("changePassword", () => {
    it("should not call API if newPassword is less than 6 chars", async () => {
      component.currentPassword = "current1";
      component.newPassword = "short";
      component.confirmPassword = "short";
      await component.changePassword();
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.any(String),
        "error"
      );
    });

    it("should not call API if passwords do not match", async () => {
      component.currentPassword = "current1";
      component.newPassword = "validpassword1";
      component.confirmPassword = "differentpassword1";
      await component.changePassword();
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.any(String),
        "error"
      );
    });

    it("should show error if currentPassword is empty", async () => {
      component.currentPassword = "";
      component.newPassword = "validpassword1";
      component.confirmPassword = "validpassword1";
      await component.changePassword();
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.any(String),
        "error"
      );
    });

    it("should show success toast on successful password change", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ message: "success" }),
      });
      component.currentPassword = "oldPass1";
      component.newPassword = "newPass123";
      component.confirmPassword = "newPass123";
      await component.changePassword();
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.any(String),
        "success"
      );
      expect(component.currentPassword).toBe("");
    });

    it("should show error toast when response is not ok (incorrect password)", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ message: "Current password is incorrect" }),
      });
      component.currentPassword = "wrongPass";
      component.newPassword = "newPass123";
      component.confirmPassword = "newPass123";
      await component.changePassword();
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.any(String),
        "error"
      );
    });

    it("should show error toast when response is not ok (generic error)", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ message: "Some other error" }),
      });
      component.currentPassword = "wrongPass";
      component.newPassword = "newPass123";
      component.confirmPassword = "newPass123";
      await component.changePassword();
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.any(String),
        "error"
      );
    });

    it("should show error toast when fetch throws", async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error("Network error"));
      component.currentPassword = "pass";
      component.newPassword = "newPass123";
      component.confirmPassword = "newPass123";
      await component.changePassword();
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.any(String),
        "error"
      );
    });
  });

  // ─── Spec 2: Estimated Cost Settings ──────────────────────────────────────

  describe("Spec 2: saveEstimatedCostSettings()", () => {
    it("should call settingsService.updateSettings with correct payload", () => {
      component.estimatedCostEnabled = true;
      component.estimatedCostMarginPercent = 25;
      component.saveEstimatedCostSettings();
      expect(settingsServiceSpy.updateSettings).toHaveBeenCalledWith({
        estimatedCostEnabled: true,
        estimatedCostMarginPercent: 25,
      });
    });

    it("should show success toast on save", () => {
      component.estimatedCostEnabled = false;
      component.estimatedCostMarginPercent = 30;
      component.saveEstimatedCostSettings();
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.any(String),
        "success"
      );
    });

    it("should show error toast and NOT call API if margin < 0", () => {
      component.estimatedCostMarginPercent = -1;
      component.saveEstimatedCostSettings();
      expect(settingsServiceSpy.updateSettings).not.toHaveBeenCalled();
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.any(String),
        "error"
      );
    });

    it("should show error toast and NOT call API if margin > 100", () => {
      component.estimatedCostMarginPercent = 101;
      component.saveEstimatedCostSettings();
      expect(settingsServiceSpy.updateSettings).not.toHaveBeenCalled();
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.any(String),
        "error"
      );
    });

    it("should show error toast when updateSettings fails", () => {
      settingsServiceSpy.updateSettings.mockReturnValue(
        throwError(() => new Error("API error"))
      );
      component.estimatedCostEnabled = true;
      component.estimatedCostMarginPercent = 30;
      component.saveEstimatedCostSettings();
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.any(String),
        "error"
      );
    });

    it("should load estimatedCostEnabled from settingsService on init", () => {
      settingsServiceSpy.loadSettings.mockReturnValue(
        of({ estimatedCostEnabled: true, estimatedCostMarginPercent: 40 })
      );
      component.ngOnInit();
      expect(component.estimatedCostEnabled).toBe(true);
      expect(component.estimatedCostMarginPercent).toBe(40);
    });
  });
});
