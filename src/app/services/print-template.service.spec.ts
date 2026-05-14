import { TestBed } from "@angular/core/testing";
import {
  HttpClientTestingModule,
  HttpTestingController,
} from "@angular/common/http/testing";
import { PrintTemplateService } from "./print-template.service";
import { environment } from "@environments/environment";

describe("PrintTemplateService", () => {
  let service: PrintTemplateService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/templates`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PrintTemplateService],
    });
    service = TestBed.inject(PrintTemplateService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  describe("getTemplates()", () => {
    it("should GET /api/templates", () => {
      service.getTemplates().subscribe();
      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe("GET");
      req.flush([]);
    });
  });

  describe("getDefaultTemplate()", () => {
    it("should GET /api/templates/default", () => {
      service.getDefaultTemplate().subscribe();
      const req = httpMock.expectOne(`${apiUrl}/default`);
      expect(req.request.method).toBe("GET");
      req.flush({ id: "t1" });
    });
  });

  describe("getTemplate()", () => {
    it("should GET /api/templates/:id", () => {
      service.getTemplate("t1").subscribe();
      const req = httpMock.expectOne(`${apiUrl}/t1`);
      expect(req.request.method).toBe("GET");
      req.flush({ id: "t1" });
    });
  });

  describe("createTemplate()", () => {
    it("should POST /api/templates with payload", () => {
      const payload = { name: "Receipt", templateType: "receipt" as const };
      service.createTemplate(payload).subscribe();
      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe("POST");
      expect(req.request.body).toEqual(payload);
      req.flush({ id: "t2", ...payload });
    });
  });

  describe("updateTemplate()", () => {
    it("should PUT /api/templates/:id with payload", () => {
      const payload = { name: "Updated" };
      service.updateTemplate("t1", payload).subscribe();
      const req = httpMock.expectOne(`${apiUrl}/t1`);
      expect(req.request.method).toBe("PUT");
      expect(req.request.body).toEqual(payload);
      req.flush({ id: "t1", ...payload });
    });
  });

  describe("deleteTemplate()", () => {
    it("should DELETE /api/templates/:id", () => {
      service.deleteTemplate("t1").subscribe();
      const req = httpMock.expectOne(`${apiUrl}/t1`);
      expect(req.request.method).toBe("DELETE");
      req.flush({ message: "deleted" });
    });
  });
});
