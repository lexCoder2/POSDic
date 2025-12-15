import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { BehaviorSubject, Observable, of } from "rxjs";
import { catchError, map } from "rxjs/operators";

@Injectable({
  providedIn: "root",
})
export class TranslationService {
  private http = inject(HttpClient);

  private langKey = "app_language";
  private _current = new BehaviorSubject<string>(this.getStoredLang() || "en");
  currentLanguage$ = this._current.asObservable();
  private _translationsChanged = new BehaviorSubject<number>(0);
  translationsChanged$ = this._translationsChanged.asObservable();
  private translations: Record<string, any> = {};

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() {
    this.loadTranslations(this._current.value);
  }

  get current() {
    return this._current.value;
  }

  setLanguage(lang: string) {
    if (!lang) return;
    this._current.next(lang);
    localStorage.setItem(this.langKey, lang);
    this.loadTranslations(lang);
  }

  private getStoredLang(): string | null {
    try {
      return localStorage.getItem(this.langKey);
    } catch (e) {
      return null;
    }
  }

  private loadTranslations(lang: string) {
    const path = `assets/i18n/${lang}.json`;
    this.http
      .get<Record<string, any>>(path)
      .pipe(catchError((_) => of({})))
      .subscribe((data) => {
        this.translations = data || {};
        // notify listeners that translations have been updated
        try {
          this._translationsChanged.next(Date.now());
        } catch (e) {
          // ignore
        }
      });
  }

  translate(key: string, params?: Record<string, any>): string {
    if (!key) return "";
    const parts = key.split(".");
    let value: any = this.translations;
    for (const p of parts) {
      if (!value) break;
      value = value[p];
    }
    if (typeof value === "string") {
      if (params) {
        Object.keys(params).forEach((k) => {
          value = value.replace(new RegExp(`{{\\s*${k}\\s*}}`, "g"), params[k]);
        });
      }
      return value;
    }
    return key;
  }
}
