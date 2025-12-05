import {
  Component,
  OnInit,
  OnDestroy,
  Output,
  EventEmitter,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { Subject, takeUntil, timeout, catchError, of } from "rxjs";
import { Product } from "../../models";
import { ProductService } from "../../services/product.service";
import { TranslatePipe } from "../../pipes/translate.pipe";
import { CurrencyPipe } from "../../pipes/currency.pipe";
import { environment } from "@environments/environment";

@Component({
  selector: "app-favorites",
  standalone: true,
  imports: [CommonModule, TranslatePipe, CurrencyPipe],
  templateUrl: "./favorites.component.html",
  styleUrls: ["./favorites.component.scss"],
})
export class FavoritesComponent implements OnInit, OnDestroy {
  @Output() productSelected = new EventEmitter<Product>();

  products: Product[] = [];
  isLoading = false;
  loadError = false;
  private destroy$ = new Subject<void>();

  constructor(private productService: ProductService) {}

  ngOnInit(): void {
    this.loadTopProducts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTopProducts(): void {
    this.isLoading = true;
    this.loadError = false;
    
    this.productService
      .getFavoriteProducts(20)
      .pipe(
        timeout(10000), // 10 second timeout
        catchError((err) => {
          console.error("Error or timeout loading favorite products:", err);
          this.loadError = true;
          return of([]);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (products) => {
          this.products = products;
          this.isLoading = false;
        },
        error: (err) => {
          console.error("Error loading favorite products:", err);
          this.isLoading = false;
          this.loadError = true;
        },
      });
  }

  selectProduct(product: Product): void {
    this.productSelected.emit(product);
  }

  getProductImageUrl(product: Product): string {
    if (product.local_image) {
      return `${environment.apiUrl}/products/image/${product.local_image}`;
    }
    return "";
  }

  onImageError(event: any): void {
    event.target.style.display = "none";
    // Show the no-image fallback
    const parent = event.target.parentElement;
    if (parent) {
      const noImage = document.createElement("div");
      noImage.className = "no-image";
      noImage.innerHTML = '<i class="fas fa-box"></i>';
      parent.appendChild(noImage);
    }
  }
}
