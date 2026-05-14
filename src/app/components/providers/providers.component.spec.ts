import { ComponentFixture, TestBed } from "@angular/core/testing";
import { EMPTY, BehaviorSubject, of } from "rxjs";
import { RouterTestingModule } from "@angular/router/testing";
import { ProvidersComponent } from "./providers.component";
import { ProviderService } from "../../services/provider.service";
import { AuthService } from "../../services/auth.service";
import { SearchStateService } from "../../services/search-state.service";
import { ToastService } from "../../services/toast.service";
import { TranslationService } from "../../services/translation.service";

describe("ProvidersComponent", () => {
  let component: ProvidersComponent;
  let fixture: ComponentFixture<ProvidersComponent>;
  let providerServiceSpy: any;
  let authServiceSpy: any;
  let toastServiceSpy: { show: jest.Mock };

  const searchQuery$ = new BehaviorSubject<string>("");
  const mockProvider = {
    _id: "p1",
    code: "ACM",
    name: "ACME Corp",
    active: true,
  };
  const mockAdminUser = {
    id: "u1",
    username: "admin",
    role: "admin",
    permissions: [],
  };

  beforeEach(async () => {
    providerServiceSpy = {
      getProviders: jest
        .fn()
        .mockReturnValue(
          of({ data: [mockProvider], pagination: { total: 1 } })
        ),
      deleteProvider: jest.fn().mockReturnValue(of({})),
      createProvider: jest.fn().mockReturnValue(of(mockProvider)),
      updateProvider: jest.fn().mockReturnValue(of(mockProvider)),
    };

    authServiceSpy = {
      getCurrentUser: jest.fn().mockReturnValue(mockAdminUser),
    };

    toastServiceSpy = { show: jest.fn() };

    const searchStateSpy = {
      searchQuery$: searchQuery$.asObservable(),
      clearSearch: jest.fn(),
      setSearchQuery: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ProvidersComponent, RouterTestingModule],
      providers: [
        { provide: ProviderService, useValue: providerServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: SearchStateService, useValue: searchStateSpy },
        { provide: ToastService, useValue: toastServiceSpy },
        {
          provide: TranslationService,
          useValue: {
            translate: jest.fn().mockReturnValue(""),
            translationsChanged$: EMPTY,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProvidersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should load providers on init", () => {
    expect(providerServiceSpy.getProviders).toHaveBeenCalled();
    expect(component.providers()).toHaveLength(1);
  });

  it("should set currentUser from authService", () => {
    expect(component.currentUser).toEqual(mockAdminUser);
  });

  describe("isAdmin()", () => {
    it("should return true for admin user", () => {
      expect(component.isAdmin()).toBe(true);
    });

    it("should return false for non-admin user", () => {
      authServiceSpy.getCurrentUser.mockReturnValue({ role: "cashier" });
      component.currentUser = { role: "cashier" } as any;
      expect(component.isAdmin()).toBe(false);
    });
  });

  describe("filteredProviders()", () => {
    it("should return all providers when searchQuery is empty", () => {
      component.searchQuery.set("");
      expect(component.filteredProviders()).toHaveLength(1);
    });

    it("should filter providers by name", () => {
      component.providers.set([
        { _id: "p1", code: "ACM", name: "ACME Corp" } as any,
        { _id: "p2", code: "OTH", name: "Other Inc" } as any,
      ]);
      component.searchQuery.set("acme");
      expect(component.filteredProviders()).toHaveLength(1);
      expect(component.filteredProviders()[0].name).toBe("ACME Corp");
    });
  });

  describe("openProviderModal()", () => {
    it("should set isEditing to false when opening for new provider", () => {
      component.openProviderModal();
      expect(component.isEditing).toBe(false);
      expect(component.showProviderModal).toBe(true);
    });

    it("should set isEditing to true when opening for existing provider", () => {
      component.openProviderModal(mockProvider as any);
      expect(component.isEditing).toBe(true);
    });
  });

  describe("showProviderModal", () => {
    it("should hide modal when set to false", () => {
      component.showProviderModal = true;
      component.showProviderModal = false;
      expect(component.showProviderModal).toBe(false);
    });
  });

  describe("pagination", () => {
    it("should initialize currentPage to 1", () => {
      expect(component.currentPage()).toBe(1);
    });

    it("nextPage() should increment page", () => {
      component.providers.set(
        Array.from(
          { length: 15 },
          (_, i) => ({ _id: `p${i}`, name: `P${i}`, code: `C${i}` }) as any
        )
      );
      component.nextPage();
      expect(component.currentPage()).toBe(2);
    });
  });

  describe("ngOnDestroy()", () => {
    it("should complete destroy$ without error", () => {
      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });

  describe("isAdmin()", () => {
    it("returns true for admin user", () => {
      component.currentUser = { role: "admin" } as any;
      expect(component.isAdmin()).toBe(true);
    });

    it("returns false for cashier", () => {
      component.currentUser = { role: "cashier" } as any;
      expect(component.isAdmin()).toBe(false);
    });
  });

  describe("loadProviders() error handling", () => {
    it("logs error when loadProviders fails", () => {
      const { throwError } = require("rxjs");
      providerServiceSpy.getProviders.mockReturnValue(
        throwError(() => new Error("fail"))
      );
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      component.loadProviders();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("saveProvider()", () => {
    it("shows info toast when name is missing", () => {
      component.providerForm = { name: "" };
      component.saveProvider();
      expect(toastServiceSpy.show).toHaveBeenCalled();
    });

    it("creates provider when not editing", () => {
      const { of } = require("rxjs");
      component.isEditing = false;
      component.providerForm = { name: "NewCo" };
      providerServiceSpy.createProvider.mockReturnValue(
        of({ _id: "n1", name: "NewCo", code: "NC" })
      );
      component.saveProvider();
      expect(providerServiceSpy.createProvider).toHaveBeenCalled();
      expect(component.showProviderModal).toBe(false);
    });

    it("logs error on create failure", () => {
      const { throwError } = require("rxjs");
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      component.isEditing = false;
      component.providerForm = { name: "NewCo" };
      providerServiceSpy.createProvider.mockReturnValue(
        throwError(() => new Error("fail"))
      );
      component.saveProvider();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("updates provider when editing", () => {
      const { of } = require("rxjs");
      const updated = { ...mockProvider, name: "Updated Corp" };
      component.isEditing = true;
      component.providerForm = { ...mockProvider };
      component.providers.set([mockProvider as any]);
      providerServiceSpy.updateProvider.mockReturnValue(of(updated));
      component.saveProvider();
      expect(providerServiceSpy.updateProvider).toHaveBeenCalled();
      expect(component.showProviderModal).toBe(false);
    });

    it("logs error on update failure", () => {
      const { throwError } = require("rxjs");
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      component.isEditing = true;
      component.providerForm = { ...mockProvider };
      providerServiceSpy.updateProvider.mockReturnValue(
        throwError(() => new Error("fail"))
      );
      component.saveProvider();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("deleteProvider()", () => {
    it("shows error when not admin", () => {
      component.currentUser = { role: "cashier" } as any;
      component.deleteProvider("p1");
      expect(toastServiceSpy.show).toHaveBeenCalled();
    });

    it("deletes provider on admin confirm", () => {
      const { of } = require("rxjs");
      component.currentUser = { role: "admin" } as any;
      component.providers.set([mockProvider as any]);
      jest.spyOn(window, "confirm").mockReturnValue(true);
      providerServiceSpy.deleteProvider.mockReturnValue(of({}));
      component.deleteProvider(mockProvider._id!);
      expect(providerServiceSpy.deleteProvider).toHaveBeenCalledWith(
        mockProvider._id
      );
      expect(component.providers().length).toBe(0);
    });

    it("does nothing when confirm is cancelled", () => {
      component.currentUser = { role: "admin" } as any;
      jest.spyOn(window, "confirm").mockReturnValue(false);
      component.deleteProvider("p1");
      expect(providerServiceSpy.deleteProvider).not.toHaveBeenCalled();
    });
  });

  describe("pagination helpers", () => {
    beforeEach(() => {
      component.providers.set(
        Array.from(
          { length: 25 },
          (_, i) => ({ _id: `p${i}`, name: `P${i}`, code: `C${i}` }) as any
        )
      );
      component.pageSize.set(10);
    });

    it("prevPage decrements page", () => {
      component.currentPage.set(2);
      component.prevPage();
      expect(component.currentPage()).toBe(1);
    });

    it("prevPage does not go below 1", () => {
      component.currentPage.set(1);
      component.prevPage();
      expect(component.currentPage()).toBe(1);
    });

    it("goToPage navigates to valid page", () => {
      component.goToPage(2);
      expect(component.currentPage()).toBe(2);
    });

    it("goToPage ignores invalid page", () => {
      component.goToPage(100);
      expect(component.currentPage()).toBe(1);
    });

    it("changePageSize resets to page 1", () => {
      component.currentPage.set(3);
      component.changePageSize(5);
      expect(component.pageSize()).toBe(5);
      expect(component.currentPage()).toBe(1);
    });

    it("getVisiblePages returns all pages when total <= 7", () => {
      component.providers.set(
        Array.from(
          { length: 3 },
          (_, i) => ({ _id: `p${i}`, name: `P${i}`, code: `C${i}` }) as any
        )
      );
      component.pageSize.set(1);
      const pages = component.getVisiblePages();
      expect(pages).toEqual([1, 2, 3]);
    });
  });
});
