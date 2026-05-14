import { TestBed } from "@angular/core/testing";
import { CurrencyPipe } from "./currency.pipe";
import { CurrencyService } from "../services/currency.service";

const makeCurrencyService = (
  symbol = "$",
  format = (v: number, d: number) => `$${v.toFixed(d)}`
) =>
  ({
    getSymbol: jest.fn().mockReturnValue(symbol),
    format: jest.fn(format),
  }) as unknown as CurrencyService;

describe("CurrencyPipe", () => {
  let pipe: CurrencyPipe;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: CurrencyService,
          useValue: makeCurrencyService(),
        },
      ],
    });

    pipe = TestBed.runInInjectionContext(() => new CurrencyPipe());
  });

  it("should create the pipe", () => {
    expect(pipe).toBeTruthy();
  });

  it("should format a valid number", () => {
    expect(pipe.transform(10.5)).toBe("$10.50");
  });

  it('should return "$0.00" for null value', () => {
    const currencyService = TestBed.inject(CurrencyService);
    (currencyService.getSymbol as jest.Mock).mockReturnValue("$");

    expect(pipe.transform(null)).toBe("$0.00");
  });

  it('should return "$0.00" for undefined value', () => {
    const currencyService = TestBed.inject(CurrencyService);
    (currencyService.getSymbol as jest.Mock).mockReturnValue("$");

    expect(pipe.transform(undefined)).toBe("$0.00");
  });

  it('should return "$0.00" for NaN value', () => {
    const currencyService = TestBed.inject(CurrencyService);
    (currencyService.getSymbol as jest.Mock).mockReturnValue("$");

    expect(pipe.transform(NaN)).toBe("$0.00");
  });

  it("should pass decimals parameter to the currency service", () => {
    const currencyService = TestBed.inject(CurrencyService);

    pipe.transform(100, 0);

    expect(currencyService.format).toHaveBeenCalledWith(100, 0);
  });
});
