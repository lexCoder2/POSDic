import {
  Component,
  OnInit,
  OnDestroy,
  output,
  inject,
  signal,
  effect,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";

import { TranslatePipe } from "../../pipes/translate.pipe";
import {
  RegisterService,
  AvailableRegister,
} from "../../services/register.service";
import { AuthService } from "../../services/auth.service";
import { ToastService } from "../../services/toast.service";
import { TranslationService } from "../../services/translation.service";

@Component({
  selector: "app-open-register",
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: "./open-register.component.html",
  styleUrls: ["./open-register.component.scss"],
})
export class OpenRegisterComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Services
  private registerService = inject(RegisterService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private translationService = inject(TranslationService);

  // Outputs
  registerOpened = output<void>();
  cancelled = output<void>();

  // State
  loading = signal<boolean>(false);

  availableRegisters = signal<AvailableRegister[]>([]);
  selectedRegister = signal<string>("");
  newRegisterNumber = "";
  openingCash: number | null = null;
  showNewRegisterInput = false;

  // User permissions
  isAdminOrManager = false;
  canManageOthers = false;

  // Device info
  deviceId = "";
  deviceName = "";
  suggestedRegister: string | null = null;
  deviceBoundRegister: string | null = null;

  ngOnInit(): void {
    this.checkUserPermissions();
    this.loadDeviceInfo();
    this.loadAvailableRegisters();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private checkUserPermissions(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.isAdminOrManager = user.role === "admin" || user.role === "manager";
    }
  }

  private loadDeviceInfo(): void {
    this.deviceId = this.registerService.getDeviceId();
    this.deviceName = this.registerService.getDeviceName();

    // Get device-specific register info
    this.registerService
      .getDeviceRegister()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.canManageOthers = response.canManageOthers;
          this.suggestedRegister = response.suggestedRegister || null;

          if (response.register && response.isDeviceBound) {
            this.deviceBoundRegister = response.register.registerNumber;
          }
        },
        error: (err) => {
          console.error("Error loading device register:", err);
        },
      });
  }

  private loadAvailableRegisters(): void {
    this.loading.set(true);
    this.registerService.getAvailableRegisters().subscribe({
      next: (response) => {
        this.availableRegisters.set([]);
        this.availableRegisters.set([...response.registers]);
        this.canManageOthers = response.canManageOthers;
        // Auto-select the device-bound register or suggested register
        if (this.availableRegisters().length > 0) {
          // First priority: device-bound register
          const boundRegister = this.availableRegisters().find(
            (r) => r.isBoundToThisDevice
          );

          if (boundRegister) {
            this.selectedRegister.set(boundRegister.registerNumber);
          }
          // Second priority: suggested register for this device
          else if (this.suggestedRegister) {
            const suggested = this.availableRegisters().find(
              (r) => r.registerNumber === this.suggestedRegister
            );
            if (suggested) {
              this.selectedRegister.set(this.suggestedRegister);
            }
          }
          // Third priority: first available register
          else if (this.availableRegisters().length === 1) {
            this.selectedRegister.set(
              this.availableRegisters()[0].registerNumber
            );
          }
        }

        this.loading.set(false);
      },
      error: (err) => {
        console.error("Error loading available registers:", err);
        this.toastService.show(
          this.translationService.translate("REGISTER.ERRORS.LOAD_FAILED") ||
            "Failed to load registers",
          "error"
        );
        this.loading.set(false);
      },
    });
  }

  isRegisterDisabled(register: AvailableRegister): boolean {
    // If user is admin/manager, they can select any register
    if (this.canManageOthers) {
      return false;
    }

    // For cashiers/employees: can only select registers bound to this device
    // or registers that are not bound to any device
    return register.isBoundToOtherDevice || false;
  }

  getRegisterTooltip(register: AvailableRegister): string {
    if (register.isBoundToThisDevice) {
      return (
        this.translationService.translate("REGISTER.DEVICE_BOUND_TO") ||
        "Linked to your device"
      );
    }

    if (register.isBoundToOtherDevice && !this.canManageOthers) {
      return (
        this.translationService.translate("REGISTER.OTHER_DEVICE") ||
        "Linked to another device"
      );
    }

    if (register.lastClosedAt) {
      const date = new Date(register.lastClosedAt);
      return `${
        this.translationService.translate("REGISTER.LAST_CLOSED") ||
        "Last closed"
      }: ${date.toLocaleString()}`;
    }

    return "";
  }

  onRegisterChange(): void {
    if (this.selectedRegister() === "new") {
      this.showNewRegisterInput = true;
      this.newRegisterNumber = "";
    } else {
      this.showNewRegisterInput = false;
    }
  }

  openRegister(): void {
    const registerNumber = this.showNewRegisterInput
      ? this.newRegisterNumber.trim()
      : this.selectedRegister;

    if (!registerNumber) {
      this.toastService.show(
        this.translationService.translate("REGISTER.ERRORS.NUMBER_REQUIRED") ||
          "Please select or enter a register number",
        "error"
      );
      return;
    }

    this.loading.set(true);

    this.registerService
      .openRegister(this.openingCash || 0, registerNumber.toString(), true)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (register) => {
          this.toastService.show(
            this.translationService.translate("REGISTER.SUCCESS.OPENED") ||
              `Register ${register.registerNumber} opened successfully`,
            "success"
          );
          this.registerOpened.emit();
        },
        error: (err) => {
          console.error("Error opening register:", err);
          this.toastService.show(
            err.error?.message ||
              this.translationService.translate(
                "REGISTER.ERRORS.OPEN_FAILED"
              ) ||
              "Failed to open register",
            "error"
          );
          this.loading.set(false);
        },
      });
  }

  cancel(): void {
    this.cancelled.emit();
  }
}
