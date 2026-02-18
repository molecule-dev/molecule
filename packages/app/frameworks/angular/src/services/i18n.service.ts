/**
 * Angular service for internationalization.
 *
 * @module
 */

import { Inject, Injectable, type OnDestroy } from '@angular/core'
import { BehaviorSubject, type Observable } from 'rxjs'

import type {
  DateFormatOptions,
  I18nProvider,
  InterpolationValues,
  LocaleConfig,
  NumberFormatOptions,
} from '@molecule/app-i18n'

import { I18N_PROVIDER } from '../tokens.js'

/**
 * Angular service for internationalization.
 *
 * Wraps molecule i18n provider and exposes state as RxJS observables.
 *
 * @example
 * ```typescript
 * @Component({
 *   selector: 'app-header',
 *   template: `
 *     <h1>{{ t('welcome.title', { name: userName }) }}</h1>
 *     <select [value]="locale$ | async" (change)="setLocale($event.target.value)">
 *       <option *ngFor="let loc of locales$ | async" [value]="loc.code">
 *         {{ loc.name }}
 *       </option>
 *     </select>
 *   `
 * })
 * export class HeaderComponent {
 *   locale$ = this.i18nService.locale$
 *   locales$ = this.i18nService.locales$
 *   userName = 'User'
 *
 *   constructor(private i18nService: MoleculeI18nService) {}
 *
 *   t(key: string, values?: Record<string, unknown>) {
 *     return this.i18nService.t(key, values)
 *   }
 *
 *   setLocale(code: string) {
 *     this.i18nService.setLocale(code)
 *   }
 * }
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class MoleculeI18nService implements OnDestroy {
  private localeSubject: BehaviorSubject<string>
  private directionSubject: BehaviorSubject<'ltr' | 'rtl'>
  private localesSubject: BehaviorSubject<LocaleConfig[]>
  private unsubscribe: (() => void) | null = null

  /**
   * Observable of the current locale code.
   */
  locale$: Observable<string>

  /**
   * Observable of the text direction.
   */
  direction$: Observable<'ltr' | 'rtl'>

  /**
   * Observable of available locales.
   */
  locales$: Observable<LocaleConfig[]>

  constructor(@Inject(I18N_PROVIDER) private provider: I18nProvider) {
    this.localeSubject = new BehaviorSubject<string>(provider.getLocale())
    this.directionSubject = new BehaviorSubject<'ltr' | 'rtl'>(provider.getDirection())
    this.localesSubject = new BehaviorSubject<LocaleConfig[]>(provider.getLocales())

    this.unsubscribe = provider.onLocaleChange(() => {
      this.localeSubject.next(provider.getLocale())
      this.directionSubject.next(provider.getDirection())
      this.localesSubject.next(provider.getLocales())
    })

    this.locale$ = this.localeSubject.asObservable()
    this.direction$ = this.directionSubject.asObservable()
    this.locales$ = this.localesSubject.asObservable()
  }

  /**
   * Get the current locale code snapshot.
   * @returns The active locale code (e.g. `'en'`, `'fr'`).
   */
  get locale(): string {
    return this.provider.getLocale()
  }

  /**
   * Get the current text direction snapshot.
   * @returns The text direction for the active locale, either `'ltr'` or `'rtl'`.
   */
  get direction(): 'ltr' | 'rtl' {
    return this.provider.getDirection()
  }

  /**
   * Translate a key.
   *
   * @param key - The dot-notation translation key to look up.
   * @param values - Optional interpolation values to substitute into the translated string.
   * @returns The translated and interpolated string for the current locale.
   */
  t(key: string, values?: InterpolationValues): string {
    return this.provider.t(key, values)
  }

  /**
   * Set the current locale.
   *
   * @param code - The locale code to switch to (e.g. `'en'`, `'fr'`).
   */
  setLocale(code: string): void {
    this.provider.setLocale(code)
  }

  /**
   * Format a number.
   *
   * @param value - The number to format.
   * @param options - Locale-aware formatting options such as style, currency, and precision.
   * @returns The locale-formatted number string.
   */
  formatNumber(value: number, options?: NumberFormatOptions): string {
    return this.provider.formatNumber(value, options)
  }

  /**
   * Format a date.
   *
   * @param value - The date to format, as a Date object, timestamp, or ISO string.
   * @param options - Locale-aware formatting options such as date style and time zone.
   * @returns The locale-formatted date string.
   */
  formatDate(value: Date | number | string, options?: DateFormatOptions): string {
    return this.provider.formatDate(value, options)
  }

  /**
   * Clean up locale change subscription and complete all subjects on service destruction.
   */
  ngOnDestroy(): void {
    this.unsubscribe?.()
    this.localeSubject.complete()
    this.directionSubject.complete()
    this.localesSubject.complete()
  }
}
