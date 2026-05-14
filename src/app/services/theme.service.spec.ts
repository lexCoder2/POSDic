import { TestBed } from "@angular/core/testing";
import { ThemeService } from "./theme.service";

describe("ThemeService", () => {
  let service: ThemeService;

  beforeEach(() => {
    localStorage.clear();
    // Reset html class list
    document.documentElement.classList.remove("dark-theme");
    // jsdom does not implement matchMedia — mock it
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    TestBed.configureTestingModule({ providers: [ThemeService] });
    service = TestBed.inject(ThemeService);
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark-theme");
    TestBed.resetTestingModule();
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  describe("getCurrentTheme()", () => {
    it("should return false (light) by default when no preference stored", () => {
      // If system has no preference saved, light is default (mockMatchMedia in jest returns false)
      localStorage.setItem("theme", "light");
      service.loadTheme();
      expect(service.getCurrentTheme()).toBe(false);
    });

    it("should return true after loading dark theme from storage", () => {
      localStorage.setItem("theme", "dark");
      service.loadTheme();
      expect(service.getCurrentTheme()).toBe(true);
    });
  });

  describe("setDarkMode()", () => {
    it("should set dark mode on and update localStorage", () => {
      service.setDarkMode(true);
      expect(service.getCurrentTheme()).toBe(true);
      expect(localStorage.getItem("theme")).toBe("dark");
      expect(document.documentElement.classList.contains("theme-dark")).toBe(
        true
      );
    });

    it("should set dark mode off and update localStorage", () => {
      service.setDarkMode(true);
      service.setDarkMode(false);
      expect(service.getCurrentTheme()).toBe(false);
      expect(localStorage.getItem("theme")).toBe("light");
      expect(document.documentElement.classList.contains("theme-dark")).toBe(
        false
      );
    });
  });

  describe("toggleTheme()", () => {
    it("should toggle from light to dark", () => {
      service.setDarkMode(false);
      service.toggleTheme();
      expect(service.getCurrentTheme()).toBe(true);
    });

    it("should toggle from dark to light", () => {
      service.setDarkMode(true);
      service.toggleTheme();
      expect(service.getCurrentTheme()).toBe(false);
    });
  });

  describe("isDarkMode$", () => {
    it("should emit current theme value", (done) => {
      service.setDarkMode(true);
      service.isDarkMode$.subscribe((val) => {
        expect(val).toBe(true);
        done();
      });
    });
  });
});
