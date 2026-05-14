import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  inject,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  AiCategorizerService,
  CategorizationResult,
} from "../../services/ai-categorizer.service";
import { ToastService } from "../../services/toast.service";
import { TranslatePipe } from "../../pipes/translate.pipe";

@Component({
  selector: "app-ai-categorizer-button",
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="ai-categorizer">
      <button
        class="ai-btn"
        [disabled]="isLoading() || !productName"
        (click)="classify()"
        [title]="'AI.CATEGORIZE_HINT' | translate"
      >
        <span *ngIf="isLoading()">...</span>
        <span *ngIf="!isLoading()">{{ "AI.CATEGORIZE" | translate }}</span>
      </button>
      <span
        *ngIf="result()"
        class="result-badge"
        [class.high]="result()!.confidence > 0.7"
      >
        {{ result()!.category }}
        <small>{{ result()!.source }}</small>
      </span>
    </div>
  `,
  styles: [
    `
      .ai-categorizer {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .ai-btn {
        padding: 4px 10px;
        font-size: 12px;
        border-radius: 4px;
        border: 1px solid #ccc;
        cursor: pointer;
        background: #f0f0f0;
      }
      .ai-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .result-badge {
        font-size: 12px;
        background: #e8f5e9;
        border-radius: 4px;
        padding: 2px 8px;
      }
      .result-badge.high {
        background: #c8e6c9;
      }
      .result-badge small {
        color: #666;
        margin-left: 4px;
      }
    `,
  ],
})
export class AiCategorizerButtonComponent {
  @Input() productName = "";
  @Input() productBrand?: string;
  @Input() productType?: string;
  @Output() categorySelected = new EventEmitter<string>();

  private aiService = inject(AiCategorizerService);
  private toastService = inject(ToastService);

  isLoading = signal<boolean>(false);
  result = signal<CategorizationResult | null>(null);

  classify(): void {
    if (!this.productName) return;
    this.isLoading.set(true);
    this.aiService
      .categorize(this.productName, this.productBrand, this.productType)
      .subscribe({
        next: (res) => {
          this.result.set(res);
          this.categorySelected.emit(res.category);
          this.isLoading.set(false);
        },
        error: () => {
          this.toastService.show("AI.CATEGORIZE_ERROR", "error");
          this.isLoading.set(false);
        },
      });
  }
}
