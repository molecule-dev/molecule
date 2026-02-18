/**
 * Angular service for theming.
 *
 * @module
 */

import { Inject, Injectable, type OnDestroy } from '@angular/core'
import { BehaviorSubject, distinctUntilChanged, map, type Observable } from 'rxjs'

import type { Theme, ThemeProvider } from '@molecule/app-theme'

import { THEME_PROVIDER } from '../tokens.js'

/**
 * Angular service for theming.
 *
 * Wraps molecule theme provider and exposes state as RxJS observables.
 *
 * @example
 * ```typescript
 * @Component({
 *   selector: 'app-root',
 *   template: `
 *     <div [style.background]="(theme$ | async)?.colors.background">
 *       <button (click)="toggleTheme()">
 *         Theme: {{ themeName$ | async }}
 *       </button>
 *     </div>
 *   `
 * })
 * export class AppComponent {
 *   theme$ = this.themeService.theme$
 *   themeName$ = this.themeService.themeName$
 *
 *   constructor(private themeService: MoleculeThemeService) {}
 *
 *   toggleTheme() {
 *     this.themeService.toggleTheme()
 *   }
 * }
 * ```
 */
@Injectable({
  providedIn: 'root',
})
/**
 * Molecule Theme Service class.
 */
export class MoleculeThemeService implements OnDestroy {
  private themeSubject: BehaviorSubject<Theme>
  private themeNameSubject: BehaviorSubject<string>
  private unsubscribe: (() => void) | null = null

  /**
   * Observable of the current theme.
   */
  theme$: Observable<Theme>

  /**
   * Observable of the current theme name.
   */
  themeName$: Observable<string>

  /**
   * Observable of the theme mode (light/dark).
   */
  mode$: Observable<'light' | 'dark'>

  constructor(@Inject(THEME_PROVIDER) private provider: ThemeProvider) {
    this.themeSubject = new BehaviorSubject<Theme>(provider.getTheme())
    this.themeNameSubject = new BehaviorSubject<string>(provider.getTheme().name)

    this.unsubscribe = provider.subscribe(() => {
      this.themeSubject.next(provider.getTheme())
      this.themeNameSubject.next(provider.getTheme().name)
    })

    this.theme$ = this.themeSubject.asObservable()
    this.themeName$ = this.themeNameSubject.asObservable()

    this.mode$ = this.theme$.pipe(
      map((theme: Theme) => theme.mode),
      distinctUntilChanged(),
    )
  }

  /**
   * Get the current theme snapshot.
   * @returns The result.
   */
  get theme(): Theme {
    return this.provider.getTheme()
  }

  /**
   * Get the current theme name snapshot.
   * @returns The result.
   */
  get themeName(): string {
    return this.provider.getTheme().name
  }

  /**
   * Get available themes.
   * @returns The result.
   */
  get themes(): Theme[] {
    return this.provider.getThemes?.() ?? []
  }

  /**
   * Set the current theme.
   *
   * @param name - Theme name
   */
  setTheme(name: string): void {
    this.provider.setTheme(name)
  }

  /**
   * Toggle to the next theme.
   */
  toggleTheme(): void {
    const themes = this.themes
    const currentName = this.themeName
    const currentIndex = themes.findIndex((t: Theme) => t.name === currentName)
    const nextIndex = (currentIndex + 1) % themes.length
    this.provider.setTheme(themes[nextIndex])
  }

  /**
   * Cleans up subscriptions and completes subjects on service destruction.
   */
  ngOnDestroy(): void {
    this.unsubscribe?.()
    this.themeSubject.complete()
    this.themeNameSubject.complete()
  }
}
