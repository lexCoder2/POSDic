import { TestBed } from "@angular/core/testing";
import {
  HttpClientTestingModule,
  HttpTestingController,
} from "@angular/common/http/testing";
import { ShoppingListService } from "./shopping-list.service";
import { environment } from "../../environments/environment";

describe("ShoppingListService", () => {
  let service: ShoppingListService;
  let httpMock: HttpTestingController;
  const base = `${environment.apiUrl}/shopping-lists`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ShoppingListService],
    });
    service = TestBed.inject(ShoppingListService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  describe("getLists()", () => {
    it("should GET shopping lists", () => {
      service.getLists().subscribe();
      const req = httpMock.expectOne(base);
      expect(req.request.method).toBe("GET");
      req.flush({ lists: [] });
    });
  });

  describe("getList()", () => {
    it("should GET a single list by id", () => {
      service.getList("abc123").subscribe();
      const req = httpMock.expectOne(`${base}/abc123`);
      expect(req.request.method).toBe("GET");
      req.flush({ list: {} });
    });
  });

  describe("createList()", () => {
    it("should POST to create a list", () => {
      service.createList("Weekly", []).subscribe();
      const req = httpMock.expectOne(base);
      expect(req.request.method).toBe("POST");
      expect(req.request.body).toMatchObject({ name: "Weekly", items: [] });
      req.flush({ list: {} });
    });
  });

  describe("updateList()", () => {
    it("should PUT to update a list", () => {
      service.updateList("abc123", { name: "Updated" }).subscribe();
      const req = httpMock.expectOne(`${base}/abc123`);
      expect(req.request.method).toBe("PUT");
      req.flush({ list: {} });
    });
  });

  describe("deleteList()", () => {
    it("should DELETE a list", () => {
      service.deleteList("abc123").subscribe();
      const req = httpMock.expectOne(`${base}/abc123`);
      expect(req.request.method).toBe("DELETE");
      req.flush({ message: "Deleted" });
    });
  });

  describe("toggleItem()", () => {
    it("should PUT to toggle item purchased state", () => {
      service.toggleItem("abc123", 0).subscribe();
      const req = httpMock.expectOne(`${base}/abc123/items/0/toggle`);
      expect(req.request.method).toBe("PUT");
      req.flush({ list: {} });
    });
  });

  describe("getRecommendations()", () => {
    it("should GET recommendations", () => {
      service.getRecommendations().subscribe();
      const req = httpMock.expectOne(`${base}/recommendations`);
      expect(req.request.method).toBe("GET");
      req.flush({ recommendations: [], weekday: 1 });
    });
  });
});
