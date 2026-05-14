import { TestBed, ComponentFixture } from "@angular/core/testing";
import {
  HttpClientTestingModule,
  HttpTestingController,
} from "@angular/common/http/testing";
import { of, throwError, Subject, BehaviorSubject, EMPTY } from "rxjs";
import { UsersComponent } from "./users.component";
import { UserService } from "../../services/user.service";
import { AuthService } from "../../services/auth.service";
import { SearchStateService } from "../../services/search-state.service";
import { ToastService } from "../../services/toast.service";
import { TranslationService } from "../../services/translation.service";
import { User, PaginatedResponse } from "../../models";
import { environment } from "@environments/environment";

const mockUser = (id: string, role: User["role"] = "cashier"): User => ({
  id,
  username: `user${id}`,
  email: `user${id}@test.com`,
  firstName: "First",
  lastName: "Last",
  role,
  active: true,
});

const paginatedUsers = (users: User[]): PaginatedResponse<User> => ({
  data: users,
  pagination: { total: users.length, page: 1, pageSize: 10, totalPages: 1 },
});

describe("UsersComponent", () => {
  let component: UsersComponent;
  let fixture: ComponentFixture<UsersComponent>;
  let userServiceSpy: any;
  let authServiceSpy: any;
  let searchStateServiceSpy: any;
  let toastServiceSpy: any;
  let translationServiceSpy: any;
  let searchQuery$: BehaviorSubject<string>;
  let httpMock: HttpTestingController;

  const adminUser = mockUser("admin1", "admin");

  beforeEach(async () => {
    searchQuery$ = new BehaviorSubject<string>("");

    userServiceSpy = {
      getUsers: jest.fn().mockReturnValue(of(paginatedUsers([]))),
      updateUser: jest.fn().mockReturnValue(of(mockUser("1"))),
      deleteUser: jest.fn().mockReturnValue(of({})),
    };
    authServiceSpy = {
      getCurrentUser: jest.fn().mockReturnValue(adminUser),
    };
    searchStateServiceSpy = {
      clearSearch: jest.fn(),
      setSearchQuery: jest.fn(),
      searchQuery$: searchQuery$.asObservable(),
    } as any;
    toastServiceSpy = { show: jest.fn() };
    translationServiceSpy = {
      translate: jest.fn().mockReturnValue("msg"),
      translationsChanged$: EMPTY,
    };

    await TestBed.configureTestingModule({
      imports: [UsersComponent, HttpClientTestingModule],
      providers: [
        { provide: UserService, useValue: userServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: SearchStateService, useValue: searchStateServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
        { provide: TranslationService, useValue: translationServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UsersComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should load current user on init", () => {
    expect(component.currentUser).toEqual(adminUser);
  });

  it("should call getUsers on init", () => {
    expect(userServiceSpy.getUsers).toHaveBeenCalled();
  });

  it("should call clearSearch on init", () => {
    expect(searchStateServiceSpy.clearSearch).toHaveBeenCalled();
  });

  describe("isAdmin", () => {
    it("should return true for admin users", () => {
      component.currentUser = adminUser;
      expect(component.isAdmin()).toBe(true);
    });

    it("should return false for non-admin users", () => {
      component.currentUser = mockUser("1", "cashier");
      expect(component.isAdmin()).toBe(false);
    });
  });

  describe("loadUsers", () => {
    it("should populate users signal on success", () => {
      const users = [mockUser("1"), mockUser("2")];
      userServiceSpy.getUsers!.mockReturnValue(of(paginatedUsers(users)));
      component.loadUsers();
      expect(component.users()).toEqual(users);
    });
  });

  describe("filteredUsers", () => {
    beforeEach(() => {
      component.users.set([
        mockUser("1"),
        {
          ...mockUser("2"),
          username: "alice",
          firstName: "Alice",
          lastName: "Smith",
        },
        {
          ...mockUser("3"),
          username: "bob",
          firstName: "Bob",
          lastName: "Jones",
        },
      ]);
    });

    it("should return all users when query is empty", () => {
      component.searchQuery.set("");
      expect(component.filteredUsers().length).toBe(3);
    });

    it("should filter by username", () => {
      component.searchQuery.set("alice");
      expect(component.filteredUsers().length).toBe(1);
      expect(component.filteredUsers()[0].username).toBe("alice");
    });

    it("should filter by last name", () => {
      component.searchQuery.set("jones");
      expect(component.filteredUsers().length).toBe(1);
    });

    it("should be case-insensitive", () => {
      component.searchQuery.set("ALICE");
      expect(component.filteredUsers().length).toBe(1);
    });
  });

  describe("openUserModal", () => {
    it("should set isEditing=false and reset form for new user", () => {
      component.openUserModal();
      expect(component.isEditing).toBe(false);
      expect(component.showUserModal).toBe(true);
      expect(component.userForm.username).toBe("");
    });

    it("should set isEditing=true and populate form for existing user", () => {
      const user = mockUser("42");
      component.openUserModal(user);
      expect(component.isEditing).toBe(true);
      expect(component.userForm.id).toBe("42");
      expect(component.userForm.username).toBe("user42");
    });
  });

  describe("saveUser validation", () => {
    it("should show toast when required fields are missing", () => {
      component.userForm = {
        username: "",
        email: "",
        firstName: "",
        lastName: "",
        role: "cashier",
      };
      component.saveUser();
      expect(toastServiceSpy.show).toHaveBeenCalled();
      expect(userServiceSpy.updateUser).not.toHaveBeenCalled();
    });

    it("should show toast when password missing for new user", () => {
      component.isEditing = false;
      component.userForm = {
        username: "u",
        email: "e@x.com",
        firstName: "F",
        lastName: "L",
        role: "cashier",
      };
      component.saveUser();
      expect(toastServiceSpy.show).toHaveBeenCalled();
    });
  });

  describe("saveUser - update", () => {
    it("should call updateUser and close modal on success", () => {
      const updatedUser = mockUser("1");
      userServiceSpy.updateUser!.mockReturnValue(of(updatedUser));
      component.isEditing = true;
      component.users.set([mockUser("1"), mockUser("2")]);
      component.userForm = {
        id: "1",
        username: "user1",
        email: "u@x.com",
        firstName: "F",
        lastName: "L",
        role: "cashier",
      };
      component.saveUser();
      expect(userServiceSpy.updateUser).toHaveBeenCalledWith(
        "1",
        component.userForm
      );
      expect(component.showUserModal).toBe(false);
    });
  });

  describe("saveUser - create", () => {
    it("should POST to register endpoint and add to users list", () => {
      const newUser = mockUser("new1");
      component.isEditing = false;
      component.users.set([]);
      component.userForm = {
        username: "n",
        email: "n@x.com",
        password: "pass123",
        firstName: "N",
        lastName: "L",
        role: "cashier",
      };
      component.saveUser();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/register`);
      expect(req.request.method).toBe("POST");
      req.flush(newUser);

      expect(component.users().length).toBe(1);
      expect(component.showUserModal).toBe(false);
    });
  });

  describe("pagination", () => {
    beforeEach(() => {
      // 25 users, page size 10
      component.users.set(
        Array.from({ length: 25 }, (_, i) => mockUser(`${i}`))
      );
      component.pageSize.set(10);
      component.currentPage.set(1);
    });

    it("should show first page of users", () => {
      expect(component.paginatedUsers().length).toBe(10);
    });

    it("should advance page on nextPage()", () => {
      component.nextPage();
      expect(component.currentPage()).toBe(2);
    });

    it("should not advance past last page", () => {
      component.currentPage.set(component.totalPages());
      component.nextPage();
      expect(component.currentPage()).toBe(component.totalPages());
    });

    it("should go back on prevPage()", () => {
      component.currentPage.set(2);
      component.prevPage();
      expect(component.currentPage()).toBe(1);
    });

    it("should not go below page 1", () => {
      component.prevPage();
      expect(component.currentPage()).toBe(1);
    });

    it("should reset to page 1 on changePageSize()", () => {
      component.currentPage.set(3);
      component.changePageSize(5);
      expect(component.currentPage()).toBe(1);
      expect(component.pageSize()).toBe(5);
    });
  });

  describe("deleteUser", () => {
    it("should show error when non-admin tries to delete", () => {
      component.currentUser = mockUser("1", "cashier");
      component.deleteUser("2");
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.stringContaining("administrator"),
        "error"
      );
    });

    it("should show error when admin tries to delete themselves", () => {
      component.currentUser = adminUser;
      component.deleteUser("admin1");
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.stringContaining("own account"),
        "error"
      );
    });
  });

  describe("getVisiblePages", () => {
    it("should return all pages when total ≤ 7", () => {
      component.users.set(
        Array.from({ length: 30 }, (_, i) => mockUser(`${i}`))
      );
      component.pageSize.set(10);
      const pages = component.getVisiblePages();
      expect(pages).toContain(1);
      expect(pages).toContain(3);
    });
  });

  describe("search state subscription", () => {
    it("should update searchQuery when searchStateService emits", () => {
      searchQuery$.next("test-query");
      expect(component.searchQuery()).toBe("test-query");
    });
  });

  describe("ngOnDestroy", () => {
    it("should call clearSearch and complete destroy$", () => {
      component.ngOnDestroy();
      expect(searchStateServiceSpy.clearSearch).toHaveBeenCalled();
    });
  });
});
