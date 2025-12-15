import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  ElementRef,
  signal,
  computed,
  inject,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { MatInputModule } from "@angular/material/input";
import { Subject, takeUntil, skip, debounceTime } from "rxjs";
import { ProductService } from "../../services/product.service";
import { CategoryService } from "../../services/category.service";
import { AuthService } from "../../services/auth.service";
import { ToastService } from "../../services/toast.service";
import { SearchStateService } from "../../services/search-state.service";
import { CurrencyService } from "../../services/currency.service";
import { Product, Category, User } from "../../models";
import { PageTitleComponent } from "../page-title/page-title.component";
import { TranslatePipe } from "../../pipes/translate.pipe";
import { TranslationService } from "../../services/translation.service";
import { ToggleSwitchComponent } from "../toggle-switch/toggle-switch.component";
import { environment } from "@environments/environment.prod";
import { ModalComponent } from "../modal/modal.component";

@Component({
  selector: "app-inventory",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ModalComponent,
    PageTitleComponent,
    TranslatePipe,
    ToggleSwitchComponent,
    MatFormFieldModule,
    MatAutocompleteModule,
    MatInputModule,
  ],
  templateUrl: "./inventory.component.html",
  styleUrls: ["./inventory.component.scss"],
})
export class InventoryComponent implements OnInit, OnDestroy, AfterViewInit {
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private authService = inject(AuthService);
  private searchStateService = inject(SearchStateService);
  private translation = inject(TranslationService);
  private toastService = inject(ToastService);
  private router = inject(Router);
  private currencyService = inject(CurrencyService);

  // Currency symbol from settings
  currencySymbol = this.currencyService.getCurrencySymbol();

  @ViewChild("barcodeInput") barcodeInput!: ElementRef<HTMLInputElement>;

  currentUser: User | null = null;
  activeTab: "products" | "categories" = "products";

  imgBaseUrl = environment.imageUrl;
  // Products
  products = signal<Product[]>([]);
  searchQuery = signal<string>("");
  totalRecords = signal<number>(0);
  selectedProduct: Product | null = null;
  showProductModal = false;
  isEditingProduct = false;

  // Pagination - server-side
  currentPage = signal<number>(1);
  pageSize = signal<number>(100);
  totalPages = signal<number>(0);

  private destroy$ = new Subject<void>();

  // Categories
  categories: Category[] = [];
  selectedCategory: Category | null = null;
  showCategoryModal = false;
  isEditingCategory = false;

  // Brand list for autocomplete
  allBrands = signal<string[]>([]);
  filteredBrands = signal<string[]>([]);

  // Category filtering
  filteredCategories = signal<Category[]>([]);

  // Bulk import
  showImportModal = false;
  importProgress = 0;
  importResults: any = null;
  selectedFile: File | null = null;

  // Product form
  productForm: any = {
    name: "",
    ean: "",
    ean13: "",
    upc: "",
    brand: "",
    category: "",
    price: 0,
    cost: 0,
    stock: 999,
    minStock: 0,
    active: true,
    requiresScale: false,
    image_url: "",
  };

  // Image upload
  selectedImageFile: File | null = null;
  uploadingImage = false;
  imagePreview: string | null = null;

  // Category form
  categoryForm: Partial<Category> = {
    name: "",
    description: "",
    icon: "fas fa-tag",
    active: true,
  };

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadProducts();
    this.loadCategories();
    this.loadBrands();

    // Subscribe to product edit requests from barcode scan
    this.searchStateService.productForEdit$
      .pipe(takeUntil(this.destroy$))
      .subscribe((product) => {
        console.log("Product for edit received:", product);
        this.openProductModal(product);
      });

    // Subscribe to header search bar with debounce
    this.searchStateService.searchQuery$
      .pipe(skip(1), debounceTime(500), takeUntil(this.destroy$))
      .subscribe((query) => {
        this.searchQuery.set(query);
        this.currentPage.set(1);
        this.loadProducts();
      });
  }

  ngAfterViewInit(): void {
    // Focus barcode input when modal is shown
    setTimeout(() => {
      if (this.showProductModal && this.barcodeInput) {
        this.barcodeInput.nativeElement.focus();
      }
    }, 100);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Handle image load errors
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = "none";
    const placeholder = img.nextElementSibling as HTMLElement;
    if (placeholder) {
      placeholder.style.display = "flex";
    }
  }

  // Check if user is admin
  isAdmin(): boolean {
    return this.currentUser?.role === "admin";
  }

  // Navigate to inventory session
  startInventorySession(): void {
    this.router.navigate(["/inventory-session"]);
  }

  // ===== PRODUCTS =====
  loadProducts(): void {
    const filters: any = {
      page: this.currentPage(),
      pageSize: this.pageSize(),
    };

    const query = this.searchQuery().trim();
    if (query) {
      filters.search = query;
    }

    this.productService.getProducts(filters).subscribe({
      next: (response) => {
        this.products.set(response.data);
        this.totalRecords.set(response.pagination.total);
        this.totalPages.set(response.pagination.totalPages);
      },
      error: (err) => console.error("Error loading products:", err),
    });
  }

  openProductModal(product?: Product): void {
    if (product) {
      this.isEditingProduct = true;
      this.selectedProduct = product;
      this.productForm = { ...product };
    } else {
      this.isEditingProduct = false;
      this.selectedProduct = null;
      this.resetProductForm();
    }
    this.showProductModal = true;

    // Focus barcode input after modal is rendered
    setTimeout(() => {
      if (this.barcodeInput) {
        this.barcodeInput.nativeElement.focus();
      }
    }, 100);
  }

  closeProductModal(): void {
    this.showProductModal = false;
    this.resetProductForm();
  }

  async saveProduct(): Promise<void> {
    if (!this.productForm.name || !this.productForm.price) {
      this.toastService.show(
        this.translation.translate("INVENTORY.ALERTS.FILL_REQUIRED"),
        "info"
      );
      return;
    }

    // Upload image if one is selected
    if (this.selectedImageFile) {
      const imageUrl = await this.uploadImage();
      if (imageUrl) {
        this.productForm.image_url = imageUrl;
      }
    }

    if (this.isEditingProduct && this.selectedProduct) {
      // Update existing product
      this.productService
        .updateProduct(this.selectedProduct._id!, this.productForm)
        .subscribe({
          next: (updatedProduct) => {
            this.toastService.show(
              this.translation.translate("INVENTORY.ALERTS.PRODUCT_UPDATED"),
              "success"
            );
            // Update local array instead of reloading
            const index = this.products().findIndex(
              (p: Product) => p._id === this.selectedProduct!._id
            );
            if (index !== -1) {
              const updatedProducts = [...this.products()];
              updatedProducts[index] = updatedProduct;
              this.products.set(updatedProducts);
            }
            this.closeProductModal();
          },
          error: (err) => {
            console.error("Error updating product:", err);
            this.toastService.show(
              this.translation.translate(
                "INVENTORY.ALERTS.PRODUCT_UPDATE_FAILED"
              ),
              "error"
            );
          },
        });
    } else {
      // Create new product
      this.productService.createProduct(this.productForm).subscribe({
        next: (newProduct) => {
          this.toastService.show(
            this.translation.translate("INVENTORY.ALERTS.PRODUCT_CREATED"),
            "success"
          );
          // Add to local array instead of reloading
          this.products.set([newProduct, ...this.products()]);
          this.closeProductModal();
        },
        error: (err) => {
          console.error("Error creating product:", err);
          this.toastService.show(
            this.translation.translate(
              "INVENTORY.ALERTS.PRODUCT_CREATE_FAILED"
            ),
            "error"
          );
        },
      });
    }
  }

  deleteProduct(productId: string): void {
    if (!this.isAdmin()) {
      this.toastService.show(
        this.translation.translate("INVENTORY.ALERTS.ADMIN_DELETE"),
        "error"
      );
      return;
    }

    const product = this.products().find((p: Product) => p._id === productId);
    if (!product) return;

    if (
      !confirm(
        this.translation.translate("INVENTORY.ALERTS.CONFIRM_DELETE", {
          name: product.name,
        })
      )
    ) {
      return;
    }

    this.productService.deleteProduct(productId).subscribe({
      next: () => {
        this.toastService.show(
          this.translation.translate("INVENTORY.ALERTS.PRODUCT_DELETED"),
          "success"
        );
        // Remove from local array instead of reloading
        this.products.set(
          this.products().filter((p: Product) => p._id !== productId)
        );
      },
      error: (err) => {
        console.error("Error deleting product:", err);
        this.toastService.show(
          this.translation.translate("INVENTORY.ALERTS.PRODUCT_DELETE_FAILED"),
          "error"
        );
      },
    });
  }

  resetProductForm(): void {
    this.productForm = {
      name: "",
      ean: "",
      ean13: "",
      upc: "",
      brand: "",
      category: "",
      price: 0,
      cost: 0,
      stock: 999,
      minStock: 0,
      active: true,
      requiresScale: false,
      image_url: "",
    };
    this.selectedImageFile = null;
    this.imagePreview = null;
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedImageFile = input.files[0];

      // Create preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
      };
      reader.readAsDataURL(this.selectedImageFile);
    }
  }

  onImageDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
      const file = event.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        this.selectedImageFile = file;

        // Create preview
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.imagePreview = e.target.result;
        };
        reader.readAsDataURL(this.selectedImageFile);
      }
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  removeImage(): void {
    this.selectedImageFile = null;
    this.imagePreview = null;
    this.productForm.image_url = "";
  }

  async uploadImage(): Promise<string | null> {
    if (!this.selectedImageFile) return null;

    const formData = new FormData();
    formData.append("image", this.selectedImageFile);

    try {
      this.uploadingImage = true;
      const response = await fetch(
        `${environment.apiUrl}/products/upload-image`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: formData,
        }
      );

      if (!response.ok) throw new Error("Upload failed");

      const data = await response.json();
      return data.imageUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      this.toastService.show("Failed to upload image", "error");
      return null;
    } finally {
      this.uploadingImage = false;
    }
  }

  // ===== CATEGORIES =====
  loadCategories(): void {
    this.categoryService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
        this.filteredCategories.set(categories);
      },
      error: (err) => console.error("Error loading categories:", err),
    });
  }

  loadBrands(): void {
    // Extract unique brands from products
    this.productService.getProducts({ pageSize: 10000 }).subscribe({
      next: (response) => {
        const brands = new Set<string>();
        response.data.forEach((product: Product) => {
          if (product.brand && product.brand.trim()) {
            brands.add(product.brand.trim());
          }
        });
        const sortedBrands = Array.from(brands).sort();
        this.allBrands.set(sortedBrands);
        this.filteredBrands.set(sortedBrands);
      },
      error: (err) => console.error("Error loading brands:", err),
    });
  }

  filterBrands(value: string): void {
    const filterValue = value.toLowerCase();
    const filtered = this.allBrands().filter((brand) =>
      brand.toLowerCase().includes(filterValue)
    );
    this.filteredBrands.set(filtered);
  }

  filterCategories(value: string): void {
    const filterValue = value.toLowerCase();
    const filtered = this.categories.filter((cat) =>
      cat.name.toLowerCase().includes(filterValue)
    );
    this.filteredCategories.set(filtered);
  }

  openCategoryModal(category?: Category): void {
    if (category) {
      this.isEditingCategory = true;
      this.selectedCategory = category;
      this.categoryForm = { ...category };
    } else {
      this.isEditingCategory = false;
      this.selectedCategory = null;
      this.resetCategoryForm();
    }
    this.showCategoryModal = true;
  }

  closeCategoryModal(): void {
    this.showCategoryModal = false;
    this.resetCategoryForm();
  }

  saveCategory(): void {
    if (!this.categoryForm.name) {
      this.toastService.show(
        this.translation.translate("INVENTORY.CATEGORY_ALERTS.FILL_REQUIRED"),
        "info"
      );
      return;
    }

    if (this.isEditingCategory && this.selectedCategory) {
      // Update existing category
      this.categoryService
        .updateCategory(this.selectedCategory._id!, this.categoryForm)
        .subscribe({
          next: (updatedCategory) => {
            this.toastService.show(
              this.translation.translate(
                "INVENTORY.CATEGORY_ALERTS.CATEGORY_UPDATED"
              ),
              "success"
            );
            // Update local array instead of reloading
            const index = this.categories.findIndex(
              (c) => c._id === this.selectedCategory!._id
            );
            if (index !== -1) {
              this.categories[index] = updatedCategory;
            }
            this.closeCategoryModal();
          },
          error: (err) => {
            console.error("Error updating category:", err);
            this.toastService.show(
              this.translation.translate(
                "INVENTORY.CATEGORY_ALERTS.CATEGORY_UPDATE_FAILED"
              ),
              "error"
            );
          },
        });
    } else {
      // Create new category
      this.categoryService.createCategory(this.categoryForm).subscribe({
        next: (newCategory) => {
          this.toastService.show(
            this.translation.translate(
              "INVENTORY.CATEGORY_ALERTS.CATEGORY_CREATED"
            ),
            "success"
          );
          // Add to local array instead of reloading
          this.categories.unshift(newCategory);
          this.closeCategoryModal();
        },
        error: (err) => {
          console.error("Error creating category:", err);
          this.toastService.show(
            this.translation.translate(
              "INVENTORY.CATEGORY_ALERTS.CATEGORY_CREATE_FAILED"
            ),
            "error"
          );
        },
      });
    }
  }

  deleteCategory(categoryId: string): void {
    if (!this.isAdmin()) {
      this.toastService.show(
        this.translation.translate("INVENTORY.CATEGORY_ALERTS.ADMIN_DELETE"),
        "error"
      );
      return;
    }

    const category = this.categories.find((c) => c._id === categoryId);
    if (!category) return;

    if (
      !confirm(
        this.translation.translate("INVENTORY.CATEGORY_ALERTS.CONFIRM_DELETE", {
          name: category.name,
        })
      )
    ) {
      return;
    }

    this.categoryService.deleteCategory(categoryId).subscribe({
      next: () => {
        this.toastService.show(
          this.translation.translate(
            "INVENTORY.CATEGORY_ALERTS.CATEGORY_DELETED"
          ),
          "success"
        );
        // Remove from local array instead of reloading
        this.categories = this.categories.filter((c) => c._id !== categoryId);
      },
      error: (err) => {
        console.error("Error deleting category:", err);
        this.toastService.show(
          this.translation.translate(
            "INVENTORY.CATEGORY_ALERTS.CATEGORY_DELETE_FAILED"
          ),
          "error"
        );
      },
    });
  }

  resetCategoryForm(): void {
    this.categoryForm = {
      name: "",
      description: "",
      icon: "fas fa-tag",
      active: true,
    };
  }

  // ===== BULK IMPORT =====
  openImportModal(): void {
    this.showImportModal = true;
    this.selectedFile = null;
    this.importProgress = 0;
    this.importResults = null;
  }

  closeImportModal(): void {
    this.showImportModal = false;
    this.selectedFile = null;
    this.importProgress = 0;
    this.importResults = null;
  }

  importProducts(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    this.selectedFile = file;
    const formData = new FormData();
    formData.append("file", file);

    this.importProgress = 50;

    this.productService.bulkImport(formData).subscribe({
      next: (result) => {
        this.importProgress = 100;
        this.importResults = result;
        this.toastService.show(
          this.translation.translate("INVENTORY.IMPORT.COMPLETED", {
            successful: result.successful,
            failed: result.failed,
          }),
          "success"
        );
        this.loadProducts();
      },
      error: (err) => {
        console.error("Error importing products:", err);
        this.importProgress = 0;
        this.toastService.show(
          this.translation.translate("INVENTORY.IMPORT.FAILED"),
          "error"
        );
      },
    });
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.set(this.currentPage() + 1);
      this.loadProducts();
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.set(this.currentPage() - 1);
      this.loadProducts();
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadProducts();
    }
  }

  changePageSize(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.loadProducts();
  }

  getVisiblePages(): number[] {
    const current = this.currentPage();
    const total = this.totalPages();
    const delta = 2; // Pages to show on each side of current
    const pages: number[] = [];

    if (total <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (current > delta + 2) {
        pages.push(-1); // Ellipsis marker
      }

      // Show pages around current
      const start = Math.max(2, current - delta);
      const end = Math.min(total - 1, current + delta);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (current < total - delta - 1) {
        pages.push(-1); // Ellipsis marker
      }

      // Always show last page
      pages.push(total);
    }

    return pages;
  }

  downloadTemplate(): void {
    // Create CSV template
    const headers = [
      "name",
      "ean",
      "ean13",
      "upc",
      "brand",
      "category",
      "price",
      "cost",
      "stock",
      "minStock",
      "active",
    ];
    const template =
      headers.join(",") +
      "\n" +
      "Sample Product,1234567890123,1234567890123,123456789012,Sample Brand,Grocery,10.99,5.50,100,10,true";

    const blob = new Blob([template], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "product_import_template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  }

  switchTab(tab: "products" | "categories"): void {
    this.activeTab = tab;
  }
}
