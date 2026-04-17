import { Injectable } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'system';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  private currentMode: ThemeMode = 'dark';
  private mediaListener: ((e: MediaQueryListEvent) => void) | null = null;

  /**
   * Initialize: read stored preference and apply it.
   * Should be called once from App.ngOnInit().
   */
  init() {
    const stored = (localStorage.getItem('theme-mode') as ThemeMode) || 'dark';
    this.apply(stored);
  }

  /** Returns the current theme mode ('light' | 'dark' | 'system') */
  getMode(): ThemeMode {
    return this.currentMode;
  }

  /**
   * Set theme mode and persist it.
   * 'system' will follow OS preference and listen for changes.
   */
  apply(mode: ThemeMode) {
    this.currentMode = mode;
    localStorage.setItem('theme-mode', mode);

    // Remove any previous system listener
    if (this.mediaListener) {
      this.mediaQuery.removeEventListener('change', this.mediaListener);
      this.mediaListener = null;
    }

    if (mode === 'system') {
      // Apply immediately based on current OS preference
      this.applyRaw(this.mediaQuery.matches ? 'dark' : 'light');
      // Listen for future OS changes
      this.mediaListener = (e: MediaQueryListEvent) => {
        this.applyRaw(e.matches ? 'dark' : 'light');
      };
      this.mediaQuery.addEventListener('change', this.mediaListener);
    } else {
      this.applyRaw(mode);
    }
  }

  /** Directly sets the data-theme attribute on <html> */
  private applyRaw(theme: 'light' | 'dark') {
    document.documentElement.setAttribute('data-theme', theme);
  }
}
