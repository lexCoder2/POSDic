import { TestBed } from "@angular/core/testing";
import { DeviceService } from "./device.service";

describe("DeviceService", () => {
  let service: DeviceService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [DeviceService] });
    service = TestBed.inject(DeviceService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("getDeviceId()", () => {
    it('should return a device ID starting with "DEV-"', () => {
      const id = service.getDeviceId();
      expect(id).toMatch(/^DEV-/);
    });

    it('should persist device ID in localStorage under "deviceId"', () => {
      service.getDeviceId();
      expect(localStorage.getItem("deviceId")).not.toBeNull();
    });

    it("should return the same ID on subsequent calls", () => {
      const id1 = service.getDeviceId();
      const id2 = service.getDeviceId();
      expect(id1).toBe(id2);
    });

    it("should reuse an existing device ID from localStorage", () => {
      localStorage.setItem("deviceId", "DEV-EXISTING");
      // Force re-initialization by creating a new instance
      const newService = new DeviceService();
      expect(newService.getDeviceId()).toBe("DEV-EXISTING");
    });
  });

  describe("getDeviceName()", () => {
    it("should return a non-empty device name", () => {
      const name = service.getDeviceName();
      expect(name).toBeTruthy();
      expect(typeof name).toBe("string");
    });

    it("should persist device name in localStorage", () => {
      service.getDeviceName();
      expect(localStorage.getItem("deviceName")).not.toBeNull();
    });

    it("should return consistent device name across calls", () => {
      const name1 = service.getDeviceName();
      const name2 = service.getDeviceName();
      expect(name1).toBe(name2);
    });

    it("should reuse existing device name from localStorage", () => {
      localStorage.setItem("deviceName", "MyTerminal");
      const newService = new DeviceService();
      expect(newService.getDeviceName()).toBe("MyTerminal");
    });
  });

  describe("setDeviceName()", () => {
    it("should update the device name in memory and localStorage", () => {
      service.setDeviceName("Register-1");
      expect(service.getDeviceName()).toBe("Register-1");
      expect(localStorage.getItem("deviceName")).toBe("Register-1");
    });
  });

  describe("getShortDeviceId()", () => {
    it("should return last 8 characters of device ID", () => {
      const id = service.getDeviceId();
      const short = service.getShortDeviceId();
      expect(short).toBe(id.slice(-8));
      expect(short.length).toBeLessThanOrEqual(8);
    });
  });

  describe("getDeviceId() - fallback when deviceId is null", () => {
    it("should generate new fingerprint when deviceId is null in memory", () => {
      (service as any).deviceId = null;
      const id = service.getDeviceId();
      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(0);
    });
  });

  describe("getDeviceName() - fallback when deviceName is null", () => {
    it("should generate default device name when deviceName is null in memory", () => {
      (service as any).deviceName = null;
      const name = service.getDeviceName();
      expect(typeof name).toBe("string");
      expect(name.length).toBeGreaterThan(0);
    });
  });
});
