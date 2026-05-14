import { TestBed } from "@angular/core/testing";
import {
  HttpClientTestingModule,
  HttpTestingController,
} from "@angular/common/http/testing";
import { PurchaseReceiptService } from "./purchase-receipt.service";
import { environment } from "../../environments/environment";

describe("PurchaseReceiptService", () => {
  let service: PurchaseReceiptService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/purchase-receipts`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PurchaseReceiptService],
    });
    service = TestBed.inject(PurchaseReceiptService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  describe("parseFile()", () => {
    it("should POST FormData to /parse", () => {
      const file = new File(["data"], "invoice.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const mockResponse = {
        items: [],
        totals: { subtotal: 0, tax: 0, total: 0 },
      };

      service.parseFile(file).subscribe((res) => {
        expect(res).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/parse`);
      expect(req.request.method).toBe("POST");
      expect(req.request.body instanceof FormData).toBe(true);
      req.flush(mockResponse);
    });
  });

  describe("saveAndApply()", () => {
    it("should POST payload to base URL", () => {
      const payload = {
        providerId: "prov1",
        originalFilename: "inv.xlsx",
        fileType: "excel",
        confirmedItems: [],
      };
      const mockReceipt = { _id: "r1", status: "applied" };

      service.saveAndApply(payload as any).subscribe((res) => {
        expect(res).toEqual(mockReceipt as any);
      });

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe("POST");
      expect(req.request.body).toEqual(payload);
      req.flush(mockReceipt);
    });
  });

  describe("getReceipts()", () => {
    it("should GET receipts without filter", () => {
      service.getReceipts().subscribe();
      const req = httpMock.expectOne((r) => r.url === apiUrl);
      expect(req.request.method).toBe("GET");
      req.flush({ data: [], pagination: {} });
    });

    it("should include providerId param when given", () => {
      service.getReceipts("prov1").subscribe();
      const req = httpMock.expectOne(
        (r) => r.url === apiUrl && r.params.get("provider") === "prov1"
      );
      req.flush({ data: [], pagination: {} });
    });
  });

  describe("getReceipt()", () => {
    it("should GET /purchase-receipts/:id", () => {
      service.getReceipt("r1").subscribe();
      const req = httpMock.expectOne(`${apiUrl}/r1`);
      expect(req.request.method).toBe("GET");
      req.flush({ _id: "r1" });
    });
  });

  describe("deleteReceipt()", () => {
    it("should DELETE /purchase-receipts/:id", () => {
      service.deleteReceipt("r1").subscribe();
      const req = httpMock.expectOne(`${apiUrl}/r1`);
      expect(req.request.method).toBe("DELETE");
      req.flush({ message: "Deleted" });
    });
  });
});
