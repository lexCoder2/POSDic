import { Injectable } from "@angular/core";
import { AuthService } from "./auth.service";
import { UserService } from "./user.service";
import { TranslationService } from "./translation.service";
import { CurrencyService } from "./currency.service";
import { ThemeService } from "./theme.service";
import { QzTrayService } from "./qz-tray.service";
import { firstValueFrom } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class AppInitService {
  constructor(
    private authService: AuthService,
    private userService: UserService,
    private translationService: TranslationService,
    private currencyService: CurrencyService,
    public themeService: ThemeService,
    private qzTrayService: QzTrayService
  ) {}

  async initializeApp(): Promise<void> {
    // Load theme preference (works for both authenticated and guest users)
    this.themeService.loadTheme();

    // Check if user is authenticated
    if (this.authService.isAuthenticated()) {
      try {
        // Load user settings from database
        const settings = await firstValueFrom(
          this.userService.getUserSettings()
        );

        // Apply settings
        if (settings.language) {
          this.translationService.setLanguage(settings.language);
        }

        if (settings.currency) {
          this.currencyService.setCurrency(settings.currency);
        }
      } catch (error) {
        console.error("Failed to load user settings on init:", error);
        // Continue with defaults if settings load fails
      }
    }

    // Initialize QZ Tray and log printer info (non-blocking)
    // This runs in the background and won't block app startup
    this.initializeQzTray();
  }

  private async initializeQzTray(): Promise<void> {
    try {
      console.log("Initializing QZ Tray for printer detection...");
      // QzTrayService auto-initializes on construction
      // The connect() call will trigger printer info logging
    } catch (error) {
      console.error("QZ Tray initialization failed:", error);
      console.log("Printing features may not be available");
    }
  }
}
