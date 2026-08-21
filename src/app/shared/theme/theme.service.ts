import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'theme';

/**
 * Tema do Grimório: dark é o padrão (tokens em :root), light é override (:root.light).
 * A classe `dark`/`light` no <html> também alimenta as variantes `dark:` do preset Spartan.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private platformId = inject(PLATFORM_ID);

  readonly theme = signal<Theme>('dark');

  init(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const saved = localStorage.getItem(STORAGE_KEY);
    this.apply(saved === 'light' ? 'light' : 'dark');
  }

  toggle(): void {
    this.apply(this.theme() === 'dark' ? 'light' : 'dark');
  }

  private apply(theme: Theme): void {
    this.theme.set(theme);
    if (!isPlatformBrowser(this.platformId)) return;
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.classList.toggle('light', theme === 'light');
    localStorage.setItem(STORAGE_KEY, theme);
  }
}
