import { Component, OnDestroy, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { Subject } from "rxjs";
import { switchMap, takeUntil } from "rxjs/operators";
import { ProviderService } from "../../services/provider.service";
import { ToastService } from "../../services/toast.service";
import { TranslatePipe } from "../../pipes/translate.pipe";
import { ProviderReceiptsComponent } from "./provider-receipts/provider-receipts.component";
import { Provider } from "../../models";

type ActiveTab = "info" | "invoices";

@Component({
  selector: "app-provider-detail",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslatePipe,
    ProviderReceiptsComponent,
  ],
  templateUrl: "./provider-detail.component.html",
  styleUrls: ["./provider-detail.component.scss"],
})
export class ProviderDetailComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private providerService = inject(ProviderService);
  private toastService = inject(ToastService);
  private destroy$ = new Subject<void>();

  provider = signal<Provider | null>(null);
  activeTab = signal<ActiveTab>("info");
  isEditing = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  isLoading = signal<boolean>(true);

  providerForm: Partial<Provider> = {};

  ngOnInit(): void {
    this.route.params
      .pipe(
        switchMap((params) => this.providerService.getProvider(params["id"])),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (p) => {
          this.provider.set(p);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.toastService.show("PROVIDERS.NOT_FOUND", "error");
          this.router.navigate(["/providers"]);
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setTab(tab: ActiveTab): void {
    this.activeTab.set(tab);
  }

  startEdit(): void {
    const p = this.provider();
    if (!p) return;
    this.providerForm = {
      name: p.name,
      contactName: p.contactName ?? "",
      email: p.email ?? "",
      phone: p.phone ?? "",
      taxId: p.taxId ?? "",
      paymentTerms: p.paymentTerms ?? "30days",
      notes: p.notes ?? "",
      active: p.active ?? true,
    };
    this.isEditing.set(true);
  }

  cancelEdit(): void {
    this.isEditing.set(false);
  }

  saveProvider(): void {
    const p = this.provider();
    if (!p?._id) return;
    this.isSaving.set(true);
    this.providerService
      .updateProvider(p._id, this.providerForm)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.provider.set(updated);
          this.isEditing.set(false);
          this.isSaving.set(false);
          this.toastService.show("PROVIDERS.UPDATED", "success");
        },
        error: () => {
          this.isSaving.set(false);
          this.toastService.show("PROVIDERS.UPDATE_ERROR", "error");
        },
      });
  }

  goBack(): void {
    this.router.navigate(["/providers"]);
  }
}
