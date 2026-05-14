import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { BehaviorSubject, Observable, tap } from "rxjs";
import { environment } from "@environments/environment";
import { AppSettings } from "../models";

const DEFAULT_SETTINGS: AppSettings = {
  estimatedCostEnabled: false,
  estimatedCostMarginPercent: 30,
  sellMode: "combined",
};

@Injectable({ providedIn: "root" })
export class SettingsService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/settings`;

  private settingsSubject = new BehaviorSubject<AppSettings>({
    ...DEFAULT_SETTINGS,
  });

  /** Observable of the current cached settings. */
  settings$: Observable<AppSettings> = this.settingsSubject.asObservable();

  /** Fetch settings from the server and update the local cache. */
  loadSettings(): Observable<AppSettings> {
    return this.getSettings().pipe(
      tap((settings) => this.settingsSubject.next(settings))
    );
  }

  /** GET /api/settings */
  getSettings(): Observable<AppSettings> {
    return this.http.get<AppSettings>(this.apiUrl);
  }

  /**
   * PUT /api/settings — partial update.
   * Also updates the local cache on success.
   */
  updateSettings(update: Partial<AppSettings>): Observable<AppSettings> {
    return this.http
      .put<AppSettings>(this.apiUrl, update)
      .pipe(tap((settings) => this.settingsSubject.next(settings)));
  }

  /**
   * Computes the estimated purchase cost for a given unit price.
   * @param unitPrice  The selling price
   * @param marginPercent  Expected margin 0–100
   */
  estimatedCost(unitPrice: number, marginPercent: number): number {
    return unitPrice * (1 - marginPercent / 100);
  }
}
