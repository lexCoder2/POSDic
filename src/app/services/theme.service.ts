import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class ThemeService {
  private isDarkMode = new BehaviorSubject<boolean>(false);
  public isDarkMode$ = this.isDarkMode.asObservable();

  constructor() {
    this.loadTheme();
  }

  public loadTheme(): void {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      this.setDarkMode(true);
    } else if (savedTheme === "light") {
      this.setDarkMode(false);
    } else {
      // Check system preference
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      this.setDarkMode(prefersDark);
    }
  }

  toggleTheme(): void {
    this.setDarkMode(!this.isDarkMode.value);
  }

  setDarkMode(isDark: boolean): void {
    this.isDarkMode.next(isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");

    if (isDark) {
      document.documentElement.classList.add("dark-theme");
    } else {
      document.documentElement.classList.remove("dark-theme");
    }
  }

  getCurrentTheme(): boolean {
    return this.isDarkMode.value;
  }
}
