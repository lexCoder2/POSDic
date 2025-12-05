import { Injectable } from "@angular/core";
import { BehaviorSubject, Subject, merge } from "rxjs";
import { debounceTime, distinctUntilChanged, filter } from "rxjs/operators";
import { Product } from "../models";

@Injectable({
  providedIn: "root",
})
export class SearchStateService {
  private searchQuerySubject = new BehaviorSubject<string>("");
  private rawSearchSubject = new Subject<string>();
  public searchQuery$ = this.searchQuerySubject.asObservable();

  private productForEditSubject = new Subject<Product>();
  public productForEdit$ = this.productForEditSubject.asObservable();

  private debounceTimeMs = 400;

  constructor() {
    // Split stream: instant for numeric, debounced for text
    const numericQueries$ = this.rawSearchSubject.pipe(
      distinctUntilChanged(),
      filter((query) => {
        const trimmed = query.trim();
        return trimmed.length === 0 || /^\d+$/.test(trimmed);
      })
    );

    const textQueries$ = this.rawSearchSubject.pipe(
      distinctUntilChanged(),
      filter((query) => {
        const trimmed = query.trim();
        return trimmed.length > 0 && !/^\d+$/.test(trimmed);
      }),
      debounceTime(this.debounceTimeMs)
    );

    // Merge both streams
    merge(numericQueries$, textQueries$).subscribe((query) => {
      this.searchQuerySubject.next(query);
    });
  }

  setSearchQuery(query: string): void {
    this.rawSearchSubject.next(query);
  }

  getSearchQuery(): string {
    return this.searchQuerySubject.value;
  }

  clearSearch(): void {
    this.rawSearchSubject.next("");
  }

  setProductForEdit(product: Product): void {
    this.productForEditSubject.next(product);
  }
}
