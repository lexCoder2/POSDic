import { TestBed } from "@angular/core/testing";
import {
  HttpClientTestingModule,
  HttpTestingController,
} from "@angular/common/http/testing";
import { ReceiptScanService } from "./receipt-scan.service";
import { environment } from "../../environments/environment";

describe("ReceiptScanService", () => {
  let service: ReceiptScanService;
  let httpMock: HttpTestingController;
  const base = `${environment.apiUrl}/receipt-scan`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ReceiptScanService],
    });
    service = TestBed.inject(ReceiptScanService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  describe("parseReceiptText()", () => {
    it("should POST receipt text to the API", () => {
      service.parseReceiptText("BIMBO\nPan x2 $4.00\nTOTAL: $4.00").subscribe();
      const req = httpMock.expectOne(`${base}/parse`);
      expect(req.request.method).toBe("POST");
      expect(req.request.body).toMatchObject({
        text: "BIMBO\nPan x2 $4.00\nTOTAL: $4.00",
      });
      req.flush({ provider: "BIMBO", items: [], total: 4.0, date: null });
    });
  });
});
