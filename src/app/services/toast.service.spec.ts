import { TestBed } from "@angular/core/testing";
import { ToastService } from "./toast.service";

describe("ToastService", () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [ToastService] });
    service = TestBed.inject(ToastService);
  });

  describe("show()", () => {
    it("should emit a toast message with the given message and type", (done) => {
      service.onToast().subscribe((toast) => {
        expect(toast.message).toBe("Operation successful");
        expect(toast.type).toBe("success");
        done();
      });

      service.show("Operation successful", "success");
    });

    it('should use "info" as default type', (done) => {
      service.onToast().subscribe((toast) => {
        expect(toast.type).toBe("info");
        done();
      });

      service.show("Hello");
    });

    it("should use 2000ms as default duration", (done) => {
      service.onToast().subscribe((toast) => {
        expect(toast.duration).toBe(2000);
        done();
      });

      service.show("test");
    });

    it("should emit unique auto-incremented IDs for each toast", (done) => {
      const ids: number[] = [];

      service.onToast().subscribe((toast) => {
        ids.push(toast.id);
        if (ids.length === 3) {
          expect(new Set(ids).size).toBe(3);
          expect(ids[1]).toBeGreaterThan(ids[0]);
          expect(ids[2]).toBeGreaterThan(ids[1]);
          done();
        }
      });

      service.show("first");
      service.show("second");
      service.show("third");
    });

    it("should emit error type toasts", (done) => {
      service.onToast().subscribe((toast) => {
        expect(toast.type).toBe("error");
        done();
      });

      service.show("Something went wrong", "error");
    });

    it("should return the toast ID", () => {
      const id = service.show("test");
      expect(typeof id).toBe("number");
      expect(id).toBeGreaterThan(0);
    });
  });
});
