import { Component, OnInit, Input, Output, EventEmitter } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Product } from "../../models";

@Component({
  selector: "app-quick-access",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="quick-access">
      <div class="products-grid" *ngIf="products.length > 0">
        <div
          class="product-card"
          *ngFor="let product of products"
          (click)="productSelected.emit(product)"
        >
          <div class="product-image">
            <img
              [src]="product.image_url || 'assets/placeholder-product.png'"
              [alt]="product.name"
              (error)="onImageError($event)"
            />
          </div>
          <div class="product-info">
            <h4 class="product-name">{{ product.name }}</h4>
            <p class="product-brand" *ngIf="product.brand">
              {{ product.brand }}
            </p>
            <p class="product-price">
              {{ product.price | currency: "PHP" : "symbol" : "1.2-2" }}
            </p>
          </div>
        </div>
      </div>
      <div class="empty-state" *ngIf="products.length === 0">
        <i class="fas fa-bolt"></i>
        <p>No quick access products</p>
      </div>
    </div>
  `,
  styles: [
    `
      .quick-access {
        background: white;
        border-radius: 12px;
        padding: 0.5rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        height: 100%;
      }

      .section-title {
        margin: 0 0 1rem 0;
        color: #333;
        font-size: 1.1rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .section-title i {
        color: #ff8c42;
      }

      .products-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 0.75rem;
        max-height: 350px;
        overflow-y: auto;
      }

      .product-card {
        background: white;
        border: 2px solid #e0e0e0;
        border-radius: 8px;
        padding: 0.75rem;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .product-card:hover {
        transform: scale(1.05);
        box-shadow: 0 4px 12px rgba(255, 209, 102, 0.3);
        border-color: #ffd166;
      }

      .product-image {
        width: 100%;
        height: 100px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 0.5rem;
        background: #f5f5f5;
        border-radius: 6px;
        overflow: hidden;
      }

      .product-image img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }

      .product-info {
        text-align: center;
      }

      .product-name {
        margin: 0 0 0.5rem 0;
        font-size: 0.85rem;
        font-weight: 600;
        color: #333;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .product-brand {
        margin: 0 0 0.25rem 0;
        font-size: 0.75rem;
        color: #666;
      }

      .product-price {
        margin: 0;
        font-size: 0.95rem;
        font-weight: 700;
        color: #ff8c42;
      }

      .empty-state {
        text-align: center;
        padding: 2rem 1rem;
        color: #999;
      }

      .empty-state i {
        font-size: 2.5rem;
        margin-bottom: 1rem;
        opacity: 0.5;
      }

      .empty-state p {
        margin: 0;
        font-size: 0.95rem;
      }
    `,
  ],
})
export class QuickAccessComponent implements OnInit {
  @Input() products: Product[] = [];
  @Output() productSelected = new EventEmitter<Product>();

  ngOnInit(): void {}

  onImageError(event: any): void {
    event.target.src = "assets/placeholder-product.png";
  }
}
