import { Component, Input, OnDestroy, OnInit, inject } from "@angular/core";

import { RouterLink, RouterLinkActive } from "@angular/router";
import { Subject, takeUntil } from "rxjs";
import { TranslatePipe } from "../../pipes/translate.pipe";
import { SettingsService } from "../../services/settings.service";

@Component({
  selector: "app-sidebar",
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: "./sidebar.component.html",
  styleUrls: ["./sidebar.component.scss"],
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Input() mobileSidebarOpen = false;
  @Input() isAdminOrManager = false;
  @Input() isAdmin = false;

  private settingsService = inject(SettingsService);
  private readonly STORAGE_KEY = "sidebar_extended";
  private destroy$ = new Subject<void>();
  isExtended = false;
  sellMode: "combined" | "split" = "combined";

  ngOnInit(): void {
    // Load saved state from localStorage, default to false (collapsed)
    const savedState = localStorage.getItem(this.STORAGE_KEY);
    this.isExtended = savedState === "true";

    this.settingsService.settings$
      .pipe(takeUntil(this.destroy$))
      .subscribe((settings) => {
        this.sellMode = settings.sellMode;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleSidebar(): void {
    this.isExtended = !this.isExtended;
    // Save state to localStorage
    localStorage.setItem(this.STORAGE_KEY, this.isExtended.toString());
  }
}
