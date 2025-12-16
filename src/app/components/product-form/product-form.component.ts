import {
  Component,
  OnInit,
  OnChanges,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  inject,
  signal,
} from "@angular/core";

import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { MatInputModule } from "@angular/material/input";
import { ProductService } from "../../services/product.service";
import { ToastService } from "../../services/toast.service";
import { TranslationService } from "../../services/translation.service";
import { CurrencyService } from "../../services/currency.service";
import { AuthService } from "../../services/auth.service";
import { TranslatePipe } from "../../pipes/translate.pipe";
import { ToggleSwitchComponent } from "../toggle-switch/toggle-switch.component";
import { ModalComponent } from "../modal/modal.component";
import { Product, Category } from "../../models";
import { environment } from "@environments/environment";

@Component({
  selector: "app-product-form",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatAutocompleteModule,
    MatInputModule,
    TranslatePipe,
    ToggleSwitchComponent,
    ModalComponent,
  ],
  templateUrl: "./product-form.component.html",
  styleUrls: ["./product-form.component.scss"],
})
export class ProductFormComponent implements OnInit, OnChanges {
  private productService = inject(ProductService);
  private toastService = inject(ToastService);
  private translation = inject(TranslationService);
  private currencyService = inject(CurrencyService);
  private authService = inject(AuthService);

  @ViewChild("barcodeInput") barcodeInput!: ElementRef<HTMLInputElement>;
  @ViewChild("videoElement") videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild("canvasElement") canvasElement!: ElementRef<HTMLCanvasElement>;

  @Input() show = false;
  @Input() product: Product | null = null;
  @Input() categories: Category[] = [];
  @Input() allBrands: string[] = [];

  @Output() closeModal = new EventEmitter<void>();
  @Output() productSaved = new EventEmitter<Product>();

  isEditingProduct = false;
  currencySymbol = this.currencyService.getCurrencySymbol();

  // Product form
  productForm: any = {
    name: "",
    ean: "",
    ean13: "",
    upc: "",
    brand: "Generic",
    category: "",
    price: 0,
    cost: 0,
    stock: 0,
    minStock: 0,
    active: true,
    requiresScale: false,
    image_url: "",
  };

  // Image upload (using signals for reactive updates)
  selectedImageFile: File | null = null;
  uploadingImage = signal<boolean>(false);
  imagePreview = signal<string | null>(null);

  // Cropping
  showCropTool = signal<boolean>(false);
  cropImage = signal<string | null>(null);
  cropArea = { x: 0, y: 0, width: 0, height: 0 };
  isDragging = false;
  isResizing = false;
  dragStart = { x: 0, y: 0 };
  resizeHandle: string | null = null;
  imageNaturalSize = { width: 0, height: 0 };

  // Webcam
  showWebcam = false;
  webcamStream: MediaStream | null = null;

  // Filtered lists
  filteredBrands: string[] = [];
  filteredCategories: Category[] = [];

  // UI toggles with localStorage persistence
  showRequiredFieldsOnly = signal<boolean>(false);
  createAnotherProduct = signal<boolean>(true);

  ngOnInit(): void {
    this.filteredBrands = [...this.allBrands];
    this.filteredCategories = [...this.categories];
    this.loadTogglesFromLocalStorage();
  }

  ngOnChanges(): void {
    if (this.product) {
      this.isEditingProduct = true;
      this.productForm = { ...this.product };
      this.imagePreview.set(this.product.image_url || null);
    } else {
      this.isEditingProduct = false;
      this.resetProductForm();
    }

    this.filteredBrands = [...this.allBrands];
    this.filteredCategories = [...this.categories];

    // Focus barcode input after modal is rendered
    if (this.show) {
      setTimeout(() => {
        if (this.barcodeInput) {
          this.barcodeInput.nativeElement.focus();
        }
      }, 100);
    }
  }

  // localStorage methods for toggle persistence
  loadTogglesFromLocalStorage(): void {
    const savedShowRequiredOnly = localStorage.getItem(
      "productForm_showRequiredFieldsOnly"
    );
    const savedCreateAnother = localStorage.getItem(
      "productForm_createAnotherProduct"
    );

    if (savedShowRequiredOnly !== null) {
      this.showRequiredFieldsOnly.set(savedShowRequiredOnly === "true");
    }
    if (savedCreateAnother !== null) {
      this.createAnotherProduct.set(savedCreateAnother === "true");
    }
  }

  onShowRequiredFieldsToggle(value: boolean): void {
    this.showRequiredFieldsOnly.set(value);
    localStorage.setItem(
      "productForm_showRequiredFieldsOnly",
      value.toString()
    );
  }

  onCreateAnotherToggle(value: boolean): void {
    this.createAnotherProduct.set(value);
    localStorage.setItem("productForm_createAnotherProduct", value.toString());
  }
  filterBrands(value: string): void {
    const filterValue = value.toLowerCase();
    this.filteredBrands = this.allBrands.filter((brand) =>
      brand.toLowerCase().includes(filterValue)
    );
  }

  filterCategories(value: string): void {
    const filterValue = value.toLowerCase();
    this.filteredCategories = this.categories.filter((cat) =>
      cat.name.toLowerCase().includes(filterValue)
    );
  }

  onBarcodeKeydown(event: KeyboardEvent): void {
    // Handle Enter key to move to next field
    if (event.key === "Enter") {
      this.onFormKeydown(event);
      return;
    }

    // Generate EAN when user presses 'b' key
    if (event.key.toLowerCase() === "b" && !this.productForm.ean) {
      event.preventDefault();
      this.generateAndSetEAN();
    }
  }

  onFormKeydown(event: KeyboardEvent): void {
    // Handle Enter key to move to next field instead of submitting
    if (event.key === "Enter") {
      event.preventDefault();
      const target = event.target as HTMLElement;
      const form = target.closest("form");

      if (form) {
        // Get all focusable elements within the form with tabindex
        const focusableElements = form.querySelectorAll(
          "[tabindex]:not([tabindex='-1'])"
        );

        const elementArray = Array.from(focusableElements).sort((a, b) => {
          const aTabIndex = a.getAttribute("tabindex");
          const bTabIndex = b.getAttribute("tabindex");
          return (
            (aTabIndex ? parseInt(aTabIndex) : 0) -
            (bTabIndex ? parseInt(bTabIndex) : 0)
          );
        }) as HTMLElement[];
        const currentIndex = elementArray.indexOf(target as HTMLElement);

        if (currentIndex >= 0 && currentIndex < elementArray.length - 1) {
          // Move to next focusable element
          elementArray[currentIndex + 1].focus();
        }
      }
    }
  }

  generateAndSetEAN(): void {
    this.productService.generateUniqueEAN().subscribe({
      next: (response) => {
        this.productForm.ean = response.ean;
        this.toastService.show(`EAN generated: ${response.ean}`, "success");
      },
      error: (err) => {
        console.error("Error generating EAN:", err);
        this.toastService.show(
          this.translation.translate(
            "INVENTORY.ALERTS.EAN_GENERATION_FAILED"
          ) || "Failed to generate EAN",
          "error"
        );
      },
    });
  }

  async onImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedImageFile = input.files[0];
      await this.processImageWithBackgroundRemoval(this.selectedImageFile);
    }
  }

  async onImageDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
      const file = event.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        this.selectedImageFile = file;
        await this.processImageWithBackgroundRemoval(file);
      }
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  removeImage(): void {
    this.selectedImageFile = null;
    this.imagePreview.set(null);
    this.productForm.image_url = "";
  }

  async resizeImage(
    file: File,
    maxWidth = 1024,
    maxHeight = 1024
  ): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e: any) => {
        img.src = e.target.result;
      };

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        let width = img.width;
        let height = img.height;

        // Calculate new dimensions maintaining aspect ratio
        if (width > maxWidth || height > maxHeight) {
          const aspectRatio = width / height;

          if (width > height) {
            width = maxWidth;
            height = width / aspectRatio;
          } else {
            height = maxHeight;
            width = height * aspectRatio;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw resized image
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to Blob with quality
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const resizedFile = new File([blob], file.name, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve(resizedFile);
            } else {
              reject(new Error("Could not create blob"));
            }
          },
          "image/jpeg",
          0.85
        );
      };

      img.onerror = () => {
        reject(new Error("Could not load image"));
      };

      reader.readAsDataURL(file);
    });
  }

  async processImageWithBackgroundRemoval(file: File): Promise<void> {
    try {
      this.uploadingImage.set(true);
      const token = this.authService.getToken();
      if (!token) {
        throw new Error("No authentication token found");
      }

      // Resize image on frontend before uploading
      console.log(
        `Original file size: ${(file.size / 1024 / 1024).toFixed(2)} MB`
      );
      const resizedFile = await this.resizeImage(file);
      console.log(
        `Resized file size: ${(resizedFile.size / 1024 / 1024).toFixed(2)} MB`
      );

      const formData = new FormData();
      formData.append("image", resizedFile);

      const response = await fetch(
        `${environment.apiUrl}/products/remove-background`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) throw new Error("Background removal failed");

      const data = await response.json();

      // Show crop tool with processed image
      const processedImageUrl = `${environment.imageUrl}${data.imageUrl}`;
      this.cropImage.set(processedImageUrl);
      this.productForm.image_url = data.imageUrl;

      // Initialize crop area to full image
      await this.initializeCropArea(processedImageUrl);
      this.showCropTool.set(true);

      if (data.warning) {
        this.toastService.show(data.warning, "info");
      }
    } catch (error) {
      console.error("Error processing image:", error);
      // Fallback to original image preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview.set(e.target.result);
      };
      reader.readAsDataURL(file);
      this.toastService.show(
        "Background removal failed, using original image",
        "info"
      );
    } finally {
      this.uploadingImage.set(false);
    }
  }

  async uploadImage(): Promise<string | null> {
    // Image is already uploaded during background removal
    // This method is kept for compatibility but returns the existing URL
    return this.productForm.image_url || null;
  }

  async initializeCropArea(imageUrl: string): Promise<void> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.imageNaturalSize = { width: img.width, height: img.height };

        // Initialize crop area to 90% of image size, centered
        const margin = 0.05;
        this.cropArea = {
          x: img.width * margin,
          y: img.height * margin,
          width: img.width * (1 - 2 * margin),
          height: img.height * (1 - 2 * margin),
        };
        resolve();
      };
      img.src = imageUrl;
    });
  }

  onCropMouseDown(event: MouseEvent, handle?: string): void {
    event.preventDefault();
    event.stopPropagation();

    const rect = (event.target as HTMLElement).getBoundingClientRect();
    this.dragStart = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    if (handle) {
      this.isResizing = true;
      this.resizeHandle = handle;
    } else {
      this.isDragging = true;
    }
  }

  onCropMouseMove(event: MouseEvent): void {
    if (!this.isDragging && !this.isResizing) return;

    const container = document.querySelector(".crop-container") as HTMLElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const scaleX = this.imageNaturalSize.width / rect.width;
    const scaleY = this.imageNaturalSize.height / rect.height;

    const mouseX = (event.clientX - rect.left) * scaleX;
    const mouseY = (event.clientY - rect.top) * scaleY;

    if (this.isDragging) {
      const newX = mouseX - this.dragStart.x * scaleX;
      const newY = mouseY - this.dragStart.y * scaleY;

      this.cropArea.x = Math.max(
        0,
        Math.min(newX, this.imageNaturalSize.width - this.cropArea.width)
      );
      this.cropArea.y = Math.max(
        0,
        Math.min(newY, this.imageNaturalSize.height - this.cropArea.height)
      );
    } else if (this.isResizing && this.resizeHandle) {
      const minSize = 50;

      switch (this.resizeHandle) {
        case "nw": {
          const newWidth = this.cropArea.x + this.cropArea.width - mouseX;
          const newHeight = this.cropArea.y + this.cropArea.height - mouseY;
          if (newWidth > minSize && newHeight > minSize) {
            this.cropArea.width = newWidth;
            this.cropArea.height = newHeight;
            this.cropArea.x = mouseX;
            this.cropArea.y = mouseY;
          }
          break;
        }
        case "se":
          this.cropArea.width = Math.max(minSize, mouseX - this.cropArea.x);
          this.cropArea.height = Math.max(minSize, mouseY - this.cropArea.y);
          break;
      }

      // Keep within bounds
      if (this.cropArea.x + this.cropArea.width > this.imageNaturalSize.width) {
        this.cropArea.width = this.imageNaturalSize.width - this.cropArea.x;
      }
      if (
        this.cropArea.y + this.cropArea.height >
        this.imageNaturalSize.height
      ) {
        this.cropArea.height = this.imageNaturalSize.height - this.cropArea.y;
      }
    }
  }

  onCropMouseUp(): void {
    this.isDragging = false;
    this.isResizing = false;
    this.resizeHandle = null;
  }

  async applyCrop(): Promise<void> {
    const imageUrl = this.cropImage();
    if (!imageUrl) return;

    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const img = new Image();
      img.crossOrigin = "anonymous";

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      // Set canvas to crop area size
      canvas.width = this.cropArea.width;
      canvas.height = this.cropArea.height;

      // Draw cropped portion
      ctx.drawImage(
        img,
        this.cropArea.x,
        this.cropArea.y,
        this.cropArea.width,
        this.cropArea.height,
        0,
        0,
        this.cropArea.width,
        this.cropArea.height
      );

      // Convert to blob and update preview
      canvas.toBlob(async (blob) => {
        if (blob) {
          const croppedFile = new File([blob], "cropped-image.png", {
            type: "image/png",
          });

          // Upload cropped image
          const formData = new FormData();
          formData.append("image", croppedFile);

          const token = this.authService.getToken();
          const response = await fetch(
            `${environment.apiUrl}/products/upload-image`,
            {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
              body: formData,
            }
          );

          if (response.ok) {
            const data = await response.json();
            this.imagePreview.set(`${environment.imageUrl}${data.imageUrl}`);
            this.productForm.image_url = data.imageUrl;
            this.showCropTool.set(false);
            this.cropImage.set(null);
          }
        }
      }, "image/png");
    } catch (error) {
      console.error("Error cropping image:", error);
      this.toastService.show("Error cropping image", "error");
    }
  }

  cancelCrop(): void {
    // Use the original processed image without cropping
    const imageUrl = this.cropImage();
    if (imageUrl) {
      this.imagePreview.set(imageUrl);
    }
    this.showCropTool.set(false);
    this.cropImage.set(null);
  }

  async saveProduct(): Promise<void> {
    if (!this.productForm.name || !this.productForm.price) {
      this.toastService.show(
        this.translation.translate("INVENTORY.ALERTS.FILL_REQUIRED"),
        "info"
      );
      return;
    }

    // If cost is not set or is 0, use price
    if (!this.productForm.cost || this.productForm.cost === 0) {
      this.productForm.cost = this.productForm.price;
    }

    // Upload image if one is selected
    if (this.selectedImageFile) {
      const imageUrl = await this.uploadImage();
      if (imageUrl) {
        this.productForm.image_url = imageUrl;
      }
    }

    // Use placeholder if no image selected
    if (!this.productForm.image_url) {
      this.productForm.image_url = "/assets/placeholder-product.png";
    }

    if (this.isEditingProduct && this.product) {
      // Update existing product
      this.productService
        .updateProduct(this.product._id!, this.productForm)
        .subscribe({
          next: (updatedProduct) => {
            this.toastService.show(
              this.translation.translate("INVENTORY.ALERTS.PRODUCT_UPDATED"),
              "success"
            );
            this.productSaved.emit(updatedProduct);
            this.onCloseModal();
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
          this.productSaved.emit(newProduct);

          // Check if user wants to create another product
          if (this.createAnotherProduct()) {
            this.resetProductForm();
            // Focus barcode input for next product
            setTimeout(() => {
              if (this.barcodeInput) {
                this.barcodeInput.nativeElement.focus();
              }
            }, 100);
          } else {
            this.onCloseModal();
          }
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

  async startWebcam(): Promise<void> {
    try {
      this.showWebcam = true;
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: 640, height: 480 },
      });
      this.webcamStream = stream;

      setTimeout(() => {
        if (this.videoElement) {
          this.videoElement.nativeElement.srcObject = stream;
        }
      }, 100);
    } catch (error) {
      console.error("Error accessing webcam:", error);
      this.toastService.show("Failed to access webcam", "error");
      this.showWebcam = false;
    }
  }

  stopWebcam(): void {
    if (this.webcamStream) {
      this.webcamStream.getTracks().forEach((track) => track.stop());
      this.webcamStream = null;
    }
    this.showWebcam = false;
  }

  capturePhoto(): void {
    if (!this.videoElement || !this.canvasElement) return;

    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    const context = canvas.getContext("2d");

    if (context) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);

      canvas.toBlob(
        async (blob) => {
          if (blob) {
            const file = new File([blob], "webcam-photo.jpg", {
              type: "image/jpeg",
            });
            this.selectedImageFile = file;
            this.stopWebcam();
            await this.processImageWithBackgroundRemoval(file);
          }
        },
        "image/jpeg",
        0.9
      );
    }
  }

  onCloseModal(): void {
    this.stopWebcam();
    this.resetProductForm();
    this.closeModal.emit();
  }

  resetProductForm(): void {
    this.productForm = {
      name: "",
      ean: "",
      ean13: "",
      upc: "",
      brand: "Generic",
      category: "",
      price: 0,
      cost: 0,
      stock: 0,
      minStock: 0,
      active: true,
      requiresScale: false,
      image_url: "",
    };
    this.selectedImageFile = null;
    this.imagePreview.set(null);
  }
}
