import { ComponentFixture, TestBed } from "@angular/core/testing";
import { NO_ERRORS_SCHEMA } from "@angular/core";
import { Subject } from "rxjs";
import { QuickAccessComponent } from "./quick-access.component";
import { CurrencyService } from "../../services/currency.service";
import { TranslationService } from "../../services/translation.service";

describe("QuickAccessComponent", () => {
  let component: QuickAccessComponent;
  let fixture: ComponentFixture<QuickAccessComponent>;
  let currencyServiceSpy: { format: jest.Mock; getSymbol: jest.Mock };

  const sampleProduct: any = {
    _id: "p1",
    name: "Apple",
    price: 1.5,
    image_url: "apple.jpg",
  };

  beforeEach(async () => {
    currencyServiceSpy = {
      format: jest
        .fn()
        .mockImplementation((value: number) => `$${value.toFixed(2)}`),
      getSymbol: jest.fn().mockReturnValue("$"),
    };

    await TestBed.configureTestingModule({
      imports: [QuickAccessComponent],
      providers: [
        { provide: CurrencyService, useValue: currencyServiceSpy },
        {
          provide: TranslationService,
          useValue: {
            translate: (key: string) => key,
            translationsChanged$: new Subject<void>(),
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(QuickAccessComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => TestBed.resetTestingModule());

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  describe("template interactions", () => {
    it("emits the product when a product card is clicked", () => {
      const spy = jest.spyOn(component.productSelected, "emit");
      component.products = [sampleProduct];
      fixture.detectChanges();

      const card = fixture.nativeElement.querySelector(".product-card");
      card.click();

      expect(spy).toHaveBeenCalledWith(sampleProduct);
    });

    it("renders the translated empty state key when no products are available", () => {
      component.products = [];
      fixture.detectChanges();

      const emptyMessage =
        fixture.nativeElement.querySelector(".empty-state p");

      expect(emptyMessage?.textContent?.trim()).toBe("QUICK_ACCESS.EMPTY");
    });
  });

  describe("onImageError()", () => {
    it("sets src to placeholder on image error", () => {
      const mockImg = document.createElement("img");
      const event = { target: mockImg } as any;
      component.onImageError(event);
      expect(mockImg.src).toContain("placeholder-product.png");
    });
  });
});
