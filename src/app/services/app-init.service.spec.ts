import { TestBed } from "@angular/core/testing";
import { of, throwError } from "rxjs";
import { AppInitService } from "./app-init.service";
import { AuthService } from "./auth.service";
import { UserService } from "./user.service";
import { TranslationService } from "./translation.service";
import { CurrencyService } from "./currency.service";
import { ThemeService } from "./theme.service";
import { QzTrayService } from "./qz-tray.service";
import { SettingsService } from "./settings.service";

describe("AppInitService", () => {
  let service: AppInitService;
  let authServiceSpy: any;
  let userServiceSpy: any;
  let translationServiceSpy: any;
  let currencyServiceSpy: any;
  let themeServiceSpy: any;
  let qzTrayServiceSpy: any;
  let settingsServiceSpy: any;

  beforeEach(() => {
    authServiceSpy = {
      isAuthenticated: jest.fn().mockReturnValue(false),
    };
    userServiceSpy = {
      getUserSettings: jest.fn().mockReturnValue(of({})),
    };
    translationServiceSpy = {
      setLanguage: jest.fn(),
      translationsChanged$: { subscribe: jest.fn() },
    };
    currencyServiceSpy = {
      setCurrency: jest.fn(),
    };
    themeServiceSpy = {
      loadTheme: jest.fn(),
    };
    qzTrayServiceSpy = {};
    settingsServiceSpy = {
      loadSettings: jest.fn().mockReturnValue(
        of({
          estimatedCostEnabled: false,
          estimatedCostMarginPercent: 30,
          sellMode: "combined",
        })
      ),
    };

    TestBed.configureTestingModule({
      providers: [
        AppInitService,
        { provide: AuthService, useValue: authServiceSpy },
        { provide: UserService, useValue: userServiceSpy },
        { provide: TranslationService, useValue: translationServiceSpy },
        { provide: CurrencyService, useValue: currencyServiceSpy },
        { provide: ThemeService, useValue: themeServiceSpy },
        { provide: QzTrayService, useValue: qzTrayServiceSpy },
        { provide: SettingsService, useValue: settingsServiceSpy },
      ],
    });
    service = TestBed.inject(AppInitService);
  });

  afterEach(() => TestBed.resetTestingModule());

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  describe("initializeApp()", () => {
    it("should call loadTheme on init", async () => {
      await service.initializeApp();
      expect(themeServiceSpy.loadTheme).toHaveBeenCalled();
    });

    it("should not load user settings when not authenticated", async () => {
      authServiceSpy.isAuthenticated.mockReturnValue(false);
      await service.initializeApp();
      expect(userServiceSpy.getUserSettings).not.toHaveBeenCalled();
      expect(settingsServiceSpy.loadSettings).not.toHaveBeenCalled();
    });

    it("should load user settings when authenticated", async () => {
      authServiceSpy.isAuthenticated.mockReturnValue(true);
      userServiceSpy.getUserSettings.mockReturnValue(
        of({ language: "es", currency: "MXN" })
      );
      await service.initializeApp();
      expect(settingsServiceSpy.loadSettings).toHaveBeenCalled();
      expect(userServiceSpy.getUserSettings).toHaveBeenCalled();
      expect(translationServiceSpy.setLanguage).toHaveBeenCalledWith("es");
      expect(currencyServiceSpy.setCurrency).toHaveBeenCalledWith("MXN");
    });

    it("should continue loading user settings when global settings fail", async () => {
      authServiceSpy.isAuthenticated.mockReturnValue(true);
      settingsServiceSpy.loadSettings.mockReturnValue(
        throwError(() => new Error("Settings error"))
      );
      userServiceSpy.getUserSettings.mockReturnValue(
        of({ language: "es", currency: "MXN" })
      );

      await expect(service.initializeApp()).resolves.toBeUndefined();

      expect(settingsServiceSpy.loadSettings).toHaveBeenCalled();
      expect(userServiceSpy.getUserSettings).toHaveBeenCalled();
      expect(translationServiceSpy.setLanguage).toHaveBeenCalledWith("es");
      expect(currencyServiceSpy.setCurrency).toHaveBeenCalledWith("MXN");
    });

    it("should handle settings load failure gracefully", async () => {
      authServiceSpy.isAuthenticated.mockReturnValue(true);
      userServiceSpy.getUserSettings.mockReturnValue(
        throwError(() => new Error("Network error"))
      );
      // Should not throw — error is caught internally
      await expect(service.initializeApp()).resolves.toBeUndefined();
    });

    it("should not call setLanguage if no language in settings", async () => {
      authServiceSpy.isAuthenticated.mockReturnValue(true);
      userServiceSpy.getUserSettings.mockReturnValue(of({ currency: "USD" }));
      await service.initializeApp();
      expect(translationServiceSpy.setLanguage).not.toHaveBeenCalled();
    });
  });
});
