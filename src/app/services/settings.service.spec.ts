import { TestBed } from "@angular/core/testing";
import {
  HttpClientTestingModule,
  HttpTestingController,
} from "@angular/common/http/testing";
import { SettingsService } from "./settings.service";
import { AppSettings } from "../models";
import { environment } from "@environments/environment";

const defaultSettings: AppSettings = {
  estimatedCostEnabled: false,
  estimatedCostMarginPercent: 30,
  sellMode: "combined",
};

describe("SettingsService", () => {
  let service: SettingsService;
  let http: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/settings`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [SettingsService],
    });
    service = TestBed.inject(SettingsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  describe("getSettings()", () => {
    it("should GET /api/settings and return AppSettings", (done) => {
      service.getSettings().subscribe((settings) => {
        expect(settings).toEqual(defaultSettings);
        done();
      });
      const req = http.expectOne(apiUrl);
      expect(req.request.method).toBe("GET");
      req.flush(defaultSettings);
    });

    it("should return an Observable<AppSettings>", (done) => {
      service.getSettings().subscribe((settings) => {
        expect(settings).toBeTruthy();
        done();
      });
      http.expectOne(apiUrl).flush(defaultSettings);
    });
  });

  describe("updateSettings()", () => {
    it("should PUT /api/settings with the provided partial payload", (done) => {
      const update = { estimatedCostEnabled: true };
      const response: AppSettings = {
        estimatedCostEnabled: true,
        estimatedCostMarginPercent: 30,
        sellMode: "combined",
      };

      service.updateSettings(update).subscribe((settings) => {
        expect(settings.estimatedCostEnabled).toBe(true);
        done();
      });

      const req = http.expectOne(apiUrl);
      expect(req.request.method).toBe("PUT");
      expect(req.request.body).toEqual(update);
      req.flush(response);
    });

    it("should PUT with partial payload when only marginPercent changes", (done) => {
      const update = { estimatedCostMarginPercent: 45 };
      const response: AppSettings = {
        estimatedCostEnabled: false,
        estimatedCostMarginPercent: 45,
        sellMode: "combined",
      };

      service.updateSettings(update).subscribe((settings) => {
        expect(settings.estimatedCostMarginPercent).toBe(45);
        done();
      });

      const req = http.expectOne(apiUrl);
      expect(req.request.body).toEqual(update);
      req.flush(response);
    });
  });

  describe("settings$ cache observable", () => {
    it("should expose a settings$ BehaviorSubject starting with defaults", (done) => {
      service.settings$.subscribe((settings) => {
        expect(settings.estimatedCostEnabled).toBe(false);
        expect(settings.estimatedCostMarginPercent).toBe(30);
        expect(settings.sellMode).toBe("combined");
        done();
      });
    });

    it("should update settings$ after loadSettings() completes", (done) => {
      service.loadSettings().subscribe(() => {
        service.settings$.subscribe((settings) => {
          expect(settings.estimatedCostEnabled).toBe(true);
          expect(settings.sellMode).toBe("split");
          done();
        });
      });
      http.expectOne(apiUrl).flush({
        estimatedCostEnabled: true,
        estimatedCostMarginPercent: 35,
        sellMode: "split",
      });
    });
  });

  describe("estimatedCost()", () => {
    it("should compute estimated cost as price * (1 - margin/100)", () => {
      expect(service.estimatedCost(100, 30)).toBeCloseTo(70);
      expect(service.estimatedCost(50, 25)).toBeCloseTo(37.5);
      expect(service.estimatedCost(100, 0)).toBeCloseTo(100);
      expect(service.estimatedCost(100, 100)).toBeCloseTo(0);
    });
  });
});
