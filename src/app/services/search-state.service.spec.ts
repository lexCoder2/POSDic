import { TestBed, fakeAsync, tick } from "@angular/core/testing";
import { SearchStateService } from "./search-state.service";

describe("SearchStateService", () => {
  let service: SearchStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [SearchStateService] });
    service = TestBed.inject(SearchStateService);
  });

  afterEach(() => TestBed.resetTestingModule());

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  describe("getSearchQuery()", () => {
    it("should return empty string initially", () => {
      expect(service.getSearchQuery()).toBe("");
    });
  });

  describe("setSearchQuery() with numeric input", () => {
    it("should emit immediately for numeric queries", fakeAsync(() => {
      let emitted: string | undefined;
      service.searchQuery$.subscribe((q) => (emitted = q));

      service.setSearchQuery("12345");
      tick(0); // numeric queries are instant (no debounce)
      expect(emitted).toBe("12345");
    }));
  });

  describe("setSearchQuery() with text input", () => {
    it("should debounce text queries by 400ms", fakeAsync(() => {
      const emissions: string[] = [];
      service.searchQuery$.subscribe((q) => emissions.push(q));

      service.setSearchQuery("app");
      tick(100);
      service.setSearchQuery("appl");
      tick(100);
      service.setSearchQuery("apple");
      tick(400); // debounce fires

      expect(emissions[emissions.length - 1]).toBe("apple");
    }));
  });

  describe("clearSearch()", () => {
    it("should emit empty string when cleared", fakeAsync(() => {
      let emitted: string | undefined;
      service.searchQuery$.subscribe((q) => (emitted = q));

      service.setSearchQuery("12345");
      tick(0);

      service.clearSearch();
      tick(0);
      expect(emitted).toBe("");
    }));
  });

  describe("setProductForEdit()", () => {
    it("should emit product to productForEdit$", (done) => {
      const mockProduct: any = { _id: "p1", name: "Apple", price: 1.5 };
      service.productForEdit$.subscribe((p) => {
        expect(p).toEqual(mockProduct);
        done();
      });
      service.setProductForEdit(mockProduct);
    });
  });
});
