import { Injectable } from "@angular/core";
import { AuthService } from "./auth.service";
import { UserService } from "./user.service";
import { TranslationService } from "./translation.service";
import { CurrencyService } from "./currency.service";
import { ThemeService } from "./theme.service";
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
    public themeService: ThemeService
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
  }
}
