import { Component, Input, Output, EventEmitter } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Product } from "../../models";
import { CurrencyPipe } from "../../pipes/currency.pipe";
import { TranslatePipe } from "../../pipes/translate.pipe";
import { environment } from "@environments/environment";

@Component({
  selector: "app-quick-access",
  standalone: true,
  imports: [CommonModule, TranslatePipe, CurrencyPipe],
  template: `
    <div class="quick-access">
      @if (products.length > 0) {
        <div class="products-grid">
          @for (product of products; track product) {
            <button
              type="button"
              class="product-card"
              (click)="productSelected.emit(product)"
              [attr.aria-label]="
                product.name + ' - ' + (product.price | appCurrency)
              "
            >
              <div class="product-image">
                @if (getProductImageUrl(product)) {
                  <img
                    [src]="getProductImageUrl(product)"
                    [alt]="product.name"
                    (error)="onImageError($event)"
                  />
                } @else {
                  <div class="no-image">
                    <i class="fas fa-box"></i>
                  </div>
                }
              </div>
              <div class="product-info">
                <h4 class="product-name">{{ product.name }}</h4>
                @if (product.brand) {
                  <p class="product-brand">
                    {{ product.brand }}
                  </p>
                }
                <p class="product-price">{{ product.price | appCurrency }}</p>
              </div>
            </button>
          }
        </div>
      }
      @if (products.length === 0) {
        <div class="empty-state">
          <i class="fas fa-bolt"></i>
          <p>{{ "QUICK_ACCESS.EMPTY" | translate }}</p>
        </div>
      }
    </div>
  `,
  styles: [
    `
      @use "src/styles/theme" as *;

      .quick-access {
        background: transparent;
        border-radius: $radius-md;
        height: 100%;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      .products-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
        gap: $spacing-xs;
        padding: $spacing-xs;
        flex: 1;
        overflow-y: auto;
        align-content: start;
        @include smooth-scroll;

        @media (max-width: $breakpoint-lg) {
          grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
        }
      }

      .product-card {
        background: var(--card-bg);
        border: 1px solid var(--border-color);
        border-radius: $radius-md;
        padding: 0.35rem;
        cursor: pointer;
        transition: $transition-all;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        width: 100%;
        font: inherit;
      }

      .product-card:hover {
        transform: translateY(-1px);
        box-shadow: var(--shadow-1);
        border-color: rgba(var(--color-primary-rgb), 0.45);
      }

      .product-card:active {
        transform: scale(0.98);
      }

      .product-image {
        width: 100%;
        aspect-ratio: 5 / 4;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--bg-tertiary);
        border-radius: $radius-sm;
        overflow: hidden;
      }

      .product-image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .product-image .no-image {
        color: var(--border-light);
        font-size: $font-size-3xl;
      }

      .product-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        text-align: center;
      }

      .product-name {
        margin: 0;
        font-size: $font-size-xs;
        font-weight: $font-weight-semibold;
        color: var(--text-primary);
        display: -webkit-box;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        line-height: $line-height-tight;
      }

      .product-brand {
        margin: 0;
        font-size: 10px;
        color: var(--text-secondary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .product-price {
        margin: 0;
        margin-top: auto;
        font-size: $font-size-xs;
        font-weight: $font-weight-bold;
        color: var(--color-primary);
      }

      .empty-state {
        text-align: center;
        padding: $spacing-2xl $spacing-lg;
        color: var(--text-light);
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }

      .empty-state i {
        font-size: $font-size-4xl;
        margin-bottom: $spacing-md;
        opacity: 0.5;
        color: var(--border-light);
      }

      .empty-state p {
        margin: 0;
        font-size: $font-size-sm;
      }
    `,
  ],
})
export class QuickAccessComponent {
  @Input() products: Product[] = [];
  @Output() productSelected = new EventEmitter<Product>();

  getProductImageUrl(product: Product): string {
    if (product.local_image) {
      if (
        product.local_image.startsWith("http://") ||
        product.local_image.startsWith("https://")
      ) {
        return product.local_image;
      }

      return `${environment.imageUrl}/${product.local_image}`;
    }

    return product.image_url || "";
  }

  onImageError(event: Event): void {
    const image = event.target as HTMLImageElement | null;

    if (image) {
      image.src = "assets/placeholder-product.png";
    }
  }
}
