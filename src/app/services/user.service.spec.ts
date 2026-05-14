import { TestBed } from "@angular/core/testing";
import {
  HttpClientTestingModule,
  HttpTestingController,
} from "@angular/common/http/testing";
import { UserService } from "./user.service";
import { environment } from "@environments/environment";

describe("UserService", () => {
  let service: UserService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/users`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [UserService],
    });
    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  describe("getUsers()", () => {
    it("should GET /api/users and return paginated response", () => {
      const mockResponse = {
        data: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
      };
      service.getUsers().subscribe((res) => expect(res).toEqual(mockResponse));
      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe("GET");
      req.flush(mockResponse);
    });

    it("should send search param when provided", () => {
      service.getUsers({ search: "john" }).subscribe();
      const req = httpMock.expectOne(
        (r) => r.url === apiUrl && r.params.get("search") === "john"
      );
      expect(req.request.params.get("search")).toBe("john");
      req.flush({ data: [], total: 0 });
    });

    it("should send page and pageSize params when provided", () => {
      service.getUsers({ page: 2, pageSize: 10 }).subscribe();
      const req = httpMock.expectOne(
        (r) =>
          r.url === apiUrl &&
          r.params.get("page") === "2" &&
          r.params.get("pageSize") === "10"
      );
      req.flush({ data: [], total: 0 });
    });
  });

  describe("getUser()", () => {
    it("should GET /api/users/:id", () => {
      const mockUser = { id: "u1", username: "admin" };
      service.getUser("u1").subscribe((res) => expect(res).toEqual(mockUser));
      const req = httpMock.expectOne(`${apiUrl}/u1`);
      expect(req.request.method).toBe("GET");
      req.flush(mockUser);
    });
  });

  describe("updateUser()", () => {
    it("should PUT /api/users/:id with payload", () => {
      const payload = { username: "updated" };
      service.updateUser("u1", payload).subscribe();
      const req = httpMock.expectOne(`${apiUrl}/u1`);
      expect(req.request.method).toBe("PUT");
      expect(req.request.body).toEqual(payload);
      req.flush({ id: "u1", ...payload });
    });
  });

  describe("deleteUser()", () => {
    it("should DELETE /api/users/:id", () => {
      service.deleteUser("u1").subscribe();
      const req = httpMock.expectOne(`${apiUrl}/u1`);
      expect(req.request.method).toBe("DELETE");
      req.flush({ message: "deleted" });
    });
  });

  describe("getCurrentUserProfile()", () => {
    it("should GET /api/users/me/profile", () => {
      service.getCurrentUserProfile().subscribe();
      const req = httpMock.expectOne(`${apiUrl}/me/profile`);
      expect(req.request.method).toBe("GET");
      req.flush({ id: "u1" });
    });
  });

  describe("getUserSettings()", () => {
    it("should GET /api/users/me/settings", () => {
      service.getUserSettings().subscribe();
      const req = httpMock.expectOne(`${apiUrl}/me/settings`);
      expect(req.request.method).toBe("GET");
      req.flush({ language: "en" });
    });
  });

  describe("updateUserSettings()", () => {
    it("should PUT /api/users/me/settings with payload", () => {
      const payload = { language: "es", currency: "MXN" };
      service.updateUserSettings(payload).subscribe();
      const req = httpMock.expectOne(`${apiUrl}/me/settings`);
      expect(req.request.method).toBe("PUT");
      expect(req.request.body).toEqual(payload);
      req.flush({ id: "u1" });
    });
  });
});
