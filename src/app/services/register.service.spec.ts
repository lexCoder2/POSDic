import { TestBed } from "@angular/core/testing";
import {
  HttpClientTestingModule,
  HttpTestingController,
} from "@angular/common/http/testing";
import { RegisterService } from "./register.service";
import { DeviceService } from "./device.service";
import { environment } from "@environments/environment";

describe("RegisterService", () => {
  let service: RegisterService;
  let httpMock: HttpTestingController;
  let deviceService: DeviceService;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [RegisterService, DeviceService],
    });

    service = TestBed.inject(RegisterService);
    httpMock = TestBed.inject(HttpTestingController);
    deviceService = TestBed.inject(DeviceService);

    // Flush the getActiveRegister call made during ctor if currentRegisterId is set
    const pending = httpMock.match(`${environment.apiUrl}/registers/active`);
    pending.forEach((r) => r.flush(null));
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  describe("getCurrentRegister()", () => {
    it("should return null initially when no register is open", () => {
      expect(service.getCurrentRegister()).toBeNull();
    });
  });

  describe("openRegister()", () => {
    it("should POST to /registers/open with opening cash and register number", () => {
      const mockRegister = {
        _id: "reg-1",
        registerNumber: "REG-001",
        openingCash: 100,
        status: "open",
      };

      service.openRegister(100, "REG-001").subscribe((reg) => {
        expect(reg._id).toBe("reg-1");
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/registers/open`);
      expect(req.request.method).toBe("POST");
      expect(req.request.body.openingCash).toBe(100);
      expect(req.request.body.registerNumber).toBe("REG-001");
      req.flush(mockRegister);
    });

    it("should update currentRegister$ observable after opening", () => {
      const mockRegister = {
        _id: "reg-1",
        registerNumber: "REG-001",
        status: "open",
      };
      let emittedRegister: any = null;

      service.currentRegister$.subscribe((r) => (emittedRegister = r));
      service.openRegister(0, "REG-001").subscribe();

      httpMock
        .expectOne(`${environment.apiUrl}/registers/open`)
        .flush(mockRegister);

      expect(emittedRegister?._id).toBe("reg-1");
    });

    it("should store register ID in localStorage", () => {
      const mockRegister = {
        _id: "reg-1",
        registerNumber: "REG-001",
        status: "open",
      };

      service.openRegister(50, "REG-001").subscribe();
      httpMock
        .expectOne(`${environment.apiUrl}/registers/open`)
        .flush(mockRegister);

      expect(localStorage.getItem("currentRegisterId")).toBe("reg-1");
    });

    it("should include deviceId and deviceName in request body when bindToDevice is true", () => {
      service.openRegister(0, "REG-001", true).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/registers/open`);
      expect(req.request.body.deviceId).toBeTruthy();
      expect(req.request.body.deviceName).toBeTruthy();
      req.flush({ _id: "r1", status: "open" });
    });

    it("should send null deviceId when bindToDevice is false", () => {
      service.openRegister(0, "REG-001", false).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/registers/open`);
      expect(req.request.body.deviceId).toBeNull();
      req.flush({ _id: "r1", status: "open" });
    });
  });

  describe("closeRegister()", () => {
    it("should POST to /registers/:id/close", () => {
      service.closeRegister("reg-1", 500, "End of day").subscribe();

      const req = httpMock.expectOne(
        `${environment.apiUrl}/registers/reg-1/close`
      );
      expect(req.request.method).toBe("POST");
      expect(req.request.body.closingCash).toBe(500);
      req.flush({ _id: "reg-1", status: "closed" });
    });

    it("should clear currentRegister$ to null after closing", () => {
      let emittedRegister: any = "initial";
      service.currentRegister$.subscribe((r) => (emittedRegister = r));

      service.closeRegister("reg-1", 0).subscribe();
      httpMock
        .expectOne(`${environment.apiUrl}/registers/reg-1/close`)
        .flush({ status: "closed" });

      expect(emittedRegister).toBeNull();
    });

    it("should remove currentRegisterId from localStorage", () => {
      localStorage.setItem("currentRegisterId", "reg-1");

      service.closeRegister("reg-1", 0).subscribe();
      httpMock
        .expectOne(`${environment.apiUrl}/registers/reg-1/close`)
        .flush({ status: "closed" });

      expect(localStorage.getItem("currentRegisterId")).toBeNull();
    });
  });

  describe("getAvailableRegisters()", () => {
    it("should GET /registers/available with deviceId query param", () => {
      service.getAvailableRegisters().subscribe();

      const req = httpMock.expectOne((r) =>
        r.url.includes("/registers/available")
      );
      expect(req.request.method).toBe("GET");
      expect(req.request.urlWithParams).toContain("deviceId=");
      req.flush({ registers: [], canManageOthers: false });
    });
  });

  describe("loadCurrentRegister() via localStorage", () => {
    it("updates currentRegister$ when register is found", () => {
      const mockReg = { _id: "r1", status: "open" };
      localStorage.setItem("currentRegisterId", "r1");

      // Recreate service so ctor calls loadCurrentRegister
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule],
        providers: [RegisterService, DeviceService],
      });
      const svc = TestBed.inject(RegisterService);
      const http2 = TestBed.inject(HttpTestingController);

      let emitted: any = "none";
      svc.currentRegister$.subscribe((r) => (emitted = r));

      http2.expectOne(`${environment.apiUrl}/registers/active`).flush(mockReg);
      expect(emitted?._id).toBe("r1");
      http2.verify();
      localStorage.clear();
    });

    it("clears localStorage when active register is null", () => {
      localStorage.setItem("currentRegisterId", "r1");

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule],
        providers: [RegisterService, DeviceService],
      });
      const svc = TestBed.inject(RegisterService);
      const http2 = TestBed.inject(HttpTestingController);

      http2.expectOne(`${environment.apiUrl}/registers/active`).flush(null);
      expect(localStorage.getItem("currentRegisterId")).toBeNull();
      http2.verify();
    });

    it("clears localStorage on fetch error", () => {
      localStorage.setItem("currentRegisterId", "r1");

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule],
        providers: [RegisterService, DeviceService],
      });
      const svc = TestBed.inject(RegisterService);
      const http2 = TestBed.inject(HttpTestingController);

      http2
        .expectOne(`${environment.apiUrl}/registers/active`)
        .flush(null, { status: 500, statusText: "Error" });
      expect(localStorage.getItem("currentRegisterId")).toBeNull();
      http2.verify();
    });
  });

  describe("updatePrintSetting()", () => {
    it("should PATCH /registers/:id/print-setting", () => {
      const mockReg = { _id: "r1", printReceiptsEnabled: true };

      service.updatePrintSetting("r1", true).subscribe((r) => {
        expect(r._id).toBe("r1");
      });

      const req = httpMock.expectOne(
        `${environment.apiUrl}/registers/r1/print-setting`
      );
      expect(req.request.method).toBe("PATCH");
      expect(req.request.body.printReceiptsEnabled).toBe(true);
      req.flush(mockReg);
    });
  });

  describe("getDeviceRegister()", () => {
    it("should GET /registers/device/:deviceId", () => {
      service.getDeviceRegister().subscribe();

      const req = httpMock.expectOne((r) =>
        r.url.includes("/registers/device/")
      );
      expect(req.request.method).toBe("GET");
      req.flush({
        register: null,
        isDeviceBound: false,
        canManageOthers: false,
      });
    });
  });

  describe("bindDeviceToRegister()", () => {
    it("should POST to /registers/device/bind", () => {
      service.bindDeviceToRegister("REG-001").subscribe();

      const req = httpMock.expectOne(
        `${environment.apiUrl}/registers/device/bind`
      );
      expect(req.request.method).toBe("POST");
      expect(req.request.body.registerNumber).toBe("REG-001");
      req.flush({ message: "Bound" });
    });
  });

  describe("getDeviceId() / getDeviceName()", () => {
    it("returns device id string", () => {
      expect(typeof service.getDeviceId()).toBe("string");
    });

    it("returns device name string", () => {
      expect(typeof service.getDeviceName()).toBe("string");
    });
  });

  describe("getRegisterHistory()", () => {
    it("should GET /registers/history without params", () => {
      service.getRegisterHistory().subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/registers/history`);
      expect(req.request.method).toBe("GET");
      req.flush([]);
    });

    it("should include date params when provided", () => {
      const start = new Date("2024-01-01");
      const end = new Date("2024-12-31");
      service.getRegisterHistory(start, end).subscribe();

      const req = httpMock.expectOne((r) =>
        r.url.includes("/registers/history")
      );
      expect(req.request.urlWithParams).toContain("startDate=");
      expect(req.request.urlWithParams).toContain("endDate=");
      req.flush([]);
    });
  });

  describe("getRegisterById()", () => {
    it("should GET /registers/:id", () => {
      service.getRegisterById("r5").subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/registers/r5`);
      expect(req.request.method).toBe("GET");
      req.flush({ _id: "r5" });
    });
  });

  describe("deleteRegister()", () => {
    it("should DELETE /registers/:id", () => {
      service.deleteRegister("r5").subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/registers/r5`);
      expect(req.request.method).toBe("DELETE");
      req.flush({ message: "Deleted" });
    });
  });

  describe("getExpectedCash()", () => {
    it("should GET /registers/active/expected-cash", () => {
      service.getExpectedCash().subscribe();

      const req = httpMock.expectOne(
        `${environment.apiUrl}/registers/active/expected-cash`
      );
      expect(req.request.method).toBe("GET");
      req.flush({
        openingCash: 100,
        totalCashSales: 200,
        expectedCash: 300,
        totalSales: 10,
        totalTransactions: 10,
        totalWithdrawals: 0,
      });
    });
  });

  describe("recordWithdrawal()", () => {
    it("should POST to /registers/:id/withdraw", () => {
      service.recordWithdrawal("r1", 50, "Petty cash").subscribe();

      const req = httpMock.expectOne(
        `${environment.apiUrl}/registers/r1/withdraw`
      );
      expect(req.request.method).toBe("POST");
      expect(req.request.body.amount).toBe(50);
      expect(req.request.body.reason).toBe("Petty cash");
      req.flush({ message: "ok", withdrawal: {} });
    });
  });
});
