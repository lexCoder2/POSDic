import { TestBed, ComponentFixture } from "@angular/core/testing";
import { of, throwError } from "rxjs";
import { RegistersComponent } from "./registers.component";
import { RegisterService } from "../../services/register.service";
import { AuthService } from "../../services/auth.service";
import { ToastService } from "../../services/toast.service";
import { Register, User } from "../../models";

const mockUser: User = {
  id: "u1",
  username: "admin",
  email: "admin@test.com",
  firstName: "Admin",
  lastName: "User",
  role: "admin",
};

const mockRegister = (
  id: string,
  status: "open" | "closed" = "closed"
): Register => ({
  _id: id,
  registerNumber: `REG-${id}`,
  openedBy: mockUser,
  openedAt: new Date(),
  openingCash: 100,
  status,
});

describe("RegistersComponent", () => {
  let component: RegistersComponent;
  let fixture: ComponentFixture<RegistersComponent>;
  let registerServiceSpy: any;
  let authServiceSpy: any;
  let toastServiceSpy: any;

  beforeEach(async () => {
    registerServiceSpy = {
      getRegisterHistory: jest.fn().mockReturnValue(of([])),
      deleteRegister: jest.fn().mockReturnValue(of({ message: "Deleted" })),
    };
    authServiceSpy = {
      getCurrentUser: jest.fn().mockReturnValue(mockUser),
    };
    toastServiceSpy = {
      show: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [RegistersComponent],
      providers: [
        { provide: RegisterService, useValue: registerServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegistersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should load current user on init", () => {
    expect(component.currentUser).toEqual(mockUser);
  });

  it("should call loadRegisters on init", () => {
    expect(registerServiceSpy.getRegisterHistory).toHaveBeenCalled();
  });

  describe("loadRegisters", () => {
    it("should populate registers on success", () => {
      const regs = [mockRegister("1"), mockRegister("2")];
      registerServiceSpy.getRegisterHistory!.mockReturnValue(of(regs));
      component.loadRegisters();
      expect(component.registers).toEqual(regs);
      expect(component.loading).toBe(false);
    });

    it("should show toast on error", () => {
      registerServiceSpy.getRegisterHistory!.mockReturnValue(
        throwError(() => new Error("fail"))
      );
      component.loadRegisters();
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.stringContaining("Error"),
        "error"
      );
      expect(component.loading).toBe(false);
    });
  });

  describe("applyFilters", () => {
    beforeEach(() => {
      component.registers = [
        mockRegister("1", "open"),
        mockRegister("2", "closed"),
        mockRegister("3", "open"),
      ];
    });

    it('should show all registers when filter is "all"', () => {
      component.filterStatus = "all";
      component.applyFilters();
      expect(component.filteredRegisters.length).toBe(3);
    });

    it('should filter by status "open"', () => {
      component.filterStatus = "open";
      component.applyFilters();
      expect(component.filteredRegisters.length).toBe(2);
    });

    it('should filter by status "closed"', () => {
      component.filterStatus = "closed";
      component.applyFilters();
      expect(component.filteredRegisters.length).toBe(1);
    });

    it("should filter by search query matching registerNumber", () => {
      component.filterStatus = "all";
      component.searchQuery = "REG-1";
      component.applyFilters();
      expect(component.filteredRegisters.length).toBe(1);
      expect(component.filteredRegisters[0]._id).toBe("1");
    });
  });

  describe("pagination", () => {
    beforeEach(() => {
      component.registers = Array.from({ length: 25 }, (_, i) =>
        mockRegister(`${i}`)
      );
      component.pageSize = 20;
      component.applyFilters();
    });

    it("should advance to next page", () => {
      component.nextPage();
      expect(component.currentPage).toBe(2);
    });

    it("should not advance past total pages", () => {
      component.currentPage = component.totalPages;
      component.nextPage();
      expect(component.currentPage).toBe(component.totalPages);
    });

    it("should go back to previous page", () => {
      component.currentPage = 2;
      component.previousPage();
      expect(component.currentPage).toBe(1);
    });

    it("should not go below page 1", () => {
      component.currentPage = 1;
      component.previousPage();
      expect(component.currentPage).toBe(1);
    });
  });

  describe("modal management", () => {
    it("should set selectedRegister and open detail modal in viewDetails()", () => {
      const reg = mockRegister("x");
      component.viewDetails(reg);
      expect(component.showDetailModal()).toBe(true);
      expect(component.selectedRegister).toEqual(reg);
    });

    it("should clear selectedRegister and close modal in closeDetailModal()", () => {
      component.viewDetails(mockRegister("x"));
      component.closeDetailModal();
      expect(component.showDetailModal()).toBe(false);
      expect(component.selectedRegister).toBeNull();
    });

    it("should open delete confirm modal in confirmDelete()", () => {
      const reg = mockRegister("y");
      component.confirmDelete(reg);
      expect(component.showDeleteConfirm()).toBe(true);
      expect(component.selectedRegister).toEqual(reg);
    });

    it("should close delete confirm modal in cancelDelete()", () => {
      component.confirmDelete(mockRegister("y"));
      component.cancelDelete();
      expect(component.showDeleteConfirm()).toBe(false);
      expect(component.selectedRegister).toBeNull();
    });
  });

  describe("deleteRegister", () => {
    it("should call service and reload on success", () => {
      component.selectedRegister = mockRegister("z");
      registerServiceSpy.getRegisterHistory!.mockReturnValue(of([]));
      component.deleteRegister();
      expect(registerServiceSpy.deleteRegister).toHaveBeenCalledWith("z");
      expect(toastServiceSpy.show).toHaveBeenCalled();
    });

    it("should do nothing if selectedRegister has no _id", () => {
      component.selectedRegister = { ...mockRegister("x"), _id: undefined };
      component.deleteRegister();
      expect(registerServiceSpy.deleteRegister).not.toHaveBeenCalled();
    });

    it("should show error toast on delete failure", () => {
      component.selectedRegister = mockRegister("z");
      registerServiceSpy.deleteRegister!.mockReturnValue(
        throwError(() => ({ error: { message: "Cannot delete" } }))
      );
      component.deleteRegister();
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        "Cannot delete",
        "error"
      );
    });
  });

  describe("clearFilters", () => {
    it("should reset all filters and reload", () => {
      component.filterStatus = "open";
      component.searchQuery = "test";
      component.clearFilters();
      expect(component.filterStatus).toBe("all");
      expect(component.searchQuery).toBe("");
      expect(registerServiceSpy.getRegisterHistory).toHaveBeenCalled();
    });
  });

  describe("onFilterChange / onDateFilterChange", () => {
    it("onFilterChange should call applyFilters", () => {
      const spy = jest.spyOn(component as any, "applyFilters");
      component.onFilterChange();
      expect(spy).toHaveBeenCalled();
    });

    it("onDateFilterChange should call loadRegisters", () => {
      const spy = jest.spyOn(component, "loadRegisters");
      component.onDateFilterChange();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe("goToPage", () => {
    it("should set currentPage when within valid range", () => {
      component.totalPages = 5;
      component.goToPage(3);
      expect(component.currentPage).toBe(3);
    });

    it("should not change page if out of range", () => {
      component.totalPages = 5;
      component.currentPage = 1;
      component.goToPage(0);
      expect(component.currentPage).toBe(1);
      component.goToPage(6);
      expect(component.currentPage).toBe(1);
    });
  });

  describe("paginatedRegisters", () => {
    it("should return slice based on current page and pageSize", () => {
      const regs = [mockRegister("1"), mockRegister("2"), mockRegister("3")];
      registerServiceSpy.getRegisterHistory.mockReturnValue(of(regs));
      component.loadRegisters();
      component.pageSize = 2;
      component.currentPage = 1;
      expect(component.paginatedRegisters.length).toBe(2);
    });
  });

  describe("getOpenedByName", () => {
    it("should return string when openedBy is a string", () => {
      const reg = { ...mockRegister("x"), openedBy: "John" };
      expect(component.getOpenedByName(reg as any)).toBe("John");
    });

    it("should return full name from User object with firstName", () => {
      const reg = {
        ...mockRegister("x"),
        openedBy: { firstName: "Jane", lastName: "Doe", username: "jdoe" },
      };
      expect(component.getOpenedByName(reg as any)).toContain("Jane");
    });

    it("should return username when no firstName", () => {
      const reg = { ...mockRegister("x"), openedBy: { username: "jdoe" } };
      expect(component.getOpenedByName(reg as any)).toBe("jdoe");
    });
  });

  describe("getClosedByName", () => {
    it('should return "-" when no closedBy', () => {
      const reg = mockRegister("x");
      expect(component.getClosedByName(reg as any)).toBe("-");
    });

    it("should return string when closedBy is a string", () => {
      const reg = { ...mockRegister("x"), closedBy: "Manager" };
      expect(component.getClosedByName(reg as any)).toBe("Manager");
    });

    it("should return username when no firstName in closedBy", () => {
      const reg = { ...mockRegister("x"), closedBy: { username: "mgr" } };
      expect(component.getClosedByName(reg as any)).toBe("mgr");
    });
  });

  describe("calculateDuration", () => {
    it('should return "Still open" when no closedAt', () => {
      const reg = mockRegister("x", "open");
      expect(component.calculateDuration(reg as any)).toBe("Still open");
    });

    it("should return hours and minutes when duration > 1 hour", () => {
      const opened = new Date("2026-01-01T08:00:00");
      const closed = new Date("2026-01-01T10:30:00");
      const reg = {
        ...mockRegister("x"),
        openedAt: opened,
        closedAt: closed,
        status: "closed",
      };
      const result = component.calculateDuration(reg as any);
      expect(result).toContain("2h");
      expect(result).toContain("30m");
    });

    it("should return only minutes when duration < 1 hour", () => {
      const opened = new Date("2026-01-01T08:00:00");
      const closed = new Date("2026-01-01T08:45:00");
      const reg = {
        ...mockRegister("x"),
        openedAt: opened,
        closedAt: closed,
        status: "closed",
      };
      const result = component.calculateDuration(reg as any);
      expect(result).toBe("45m");
    });
  });

  describe("exportToCSV", () => {
    it("should create download link and trigger click", () => {
      const createObjectURLSpy = jest.fn().mockReturnValue("blob:url");
      const revokeObjectURLSpy = jest.fn();
      window.URL.createObjectURL = createObjectURLSpy;
      window.URL.revokeObjectURL = revokeObjectURLSpy;
      const clickSpy = jest.fn();
      jest
        .spyOn(document, "createElement")
        .mockReturnValue({ href: "", download: "", click: clickSpy } as any);
      component.filteredRegisters = [mockRegister("1")];
      component.exportToCSV();
      expect(createObjectURLSpy).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
    });
  });
});
