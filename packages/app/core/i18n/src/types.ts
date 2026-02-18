/**
 * Type definitions for the internationalization (i18n) module.
 *
 * @module
 */

/**
 * Translation key/value map.
 */
export interface Translations {
  [key: string]: string | Translations
}

/**
 * Key-value map of interpolation variables passed to a translation string (e.g. `{ name: 'World' }`).
 */
export type InterpolationValues = Record<string, string | number | boolean | Date>

/**
 * Plural form resolution rule mapping a count to a translation category (zero, one, two, few, many, other).
 */
export interface PluralRule {
  /**
   * Zero count text.
   */
  zero?: string

  /**
   * One count text.
   */
  one?: string

  /**
   * Two count text.
   */
  two?: string

  /**
   * Few count text (for some languages).
   */
  few?: string

  /**
   * Many count text.
   */
  many?: string

  /**
   * Other count text (default).
   */
  other: string
}

/**
 * Configuration for a supported locale (code, display name, text direction, translations or lazy loader).
 */
export interface LocaleConfig {
  /**
   * Locale code (e.g., 'en-US', 'fr-FR').
   */
  code: string

  /**
   * Display name (e.g., 'English (US)', 'Francais').
   */
  name: string

  /**
   * Native display name.
   */
  nativeName?: string

  /**
   * Text direction.
   */
  direction?: 'ltr' | 'rtl'

  /**
   * Translations for this locale.
   */
  translations?: Translations

  /**
   * Lazy loader for translations. Called on first setLocale() to this locale.
   * When provided, translations can be omitted and will be loaded on demand.
   */
  loader?: () => Promise<Translations>
}

/**
 * Number format options.
 */
export interface NumberFormatOptions {
  /**
   * Number style.
   */
  style?: 'decimal' | 'currency' | 'percent' | 'unit'

  /**
   * Currency code (for currency style).
   */
  currency?: string

  /**
   * Minimum fraction digits.
   */
  minimumFractionDigits?: number

  /**
   * Maximum fraction digits.
   */
  maximumFractionDigits?: number

  /**
   * Use grouping separators.
   */
  useGrouping?: boolean
}

/**
 * Date format options.
 */
export interface DateFormatOptions {
  /**
   * Date style.
   */
  dateStyle?: 'full' | 'long' | 'medium' | 'short'

  /**
   * Time style.
   */
  timeStyle?: 'full' | 'long' | 'medium' | 'short'

  /**
   * Custom format string (implementation-specific).
   */
  format?: string

  /**
   * Relative time.
   */
  relative?: boolean
}

/**
 * i18n provider interface.
 *
 * All i18n providers must implement this interface.
 */
export interface I18nProvider {
  /**
   * Gets the current locale.
   */
  getLocale(): string

  /**
   * Sets the current locale.
   */
  setLocale(locale: string): Promise<void>

  /**
   * Gets all available locales.
   */
  getLocales(): LocaleConfig[]

  /**
   * Adds a locale.
   */
  addLocale(config: LocaleConfig): void

  /**
   * Adds translations to a locale.
   */
  addTranslations(locale: string, translations: Translations, namespace?: string): void

  /**
   * Translates a key with optional interpolation values and pluralization.
   *
   * @returns The translated string, or the default value / key if not found.
   */
  t(
    key: string,
    values?: InterpolationValues,
    options?: { defaultValue?: string; count?: number },
  ): string

  /**
   * Checks if a translation key exists in the current locale.
   *
   * @returns `true` if the key has a translation.
   */
  exists(key: string): boolean

  /**
   * Formats a number according to the current locale.
   *
   * @returns The locale-formatted number string.
   */
  formatNumber(value: number, options?: NumberFormatOptions): string

  /**
   * Formats a date according to the current locale.
   *
   * @returns The locale-formatted date string.
   */
  formatDate(value: Date | number | string, options?: DateFormatOptions): string

  /**
   * Formats a relative time (e.g. "2 hours ago").
   *
   * @returns The locale-formatted relative time string.
   */
  formatRelativeTime(value: Date | number, options?: { unit?: Intl.RelativeTimeFormatUnit }): string

  /**
   * Formats a list (e.g. "A, B, and C").
   *
   * @returns The locale-formatted list string.
   */
  formatList(values: string[], options?: { type?: 'conjunction' | 'disjunction' | 'unit' }): string

  /**
   * Subscribes to locale changes.
   *
   * @returns An unsubscribe function.
   */
  onLocaleChange(listener: (locale: string) => void): () => void

  /**
   * Gets the text direction for the current locale.
   *
   * @returns `'ltr'` or `'rtl'`.
   */
  getDirection(): 'ltr' | 'rtl'

  /**
   * Checks if a translation key exists (alias for exists).
   */
  hasKey?(key: string): boolean

  /**
   * Checks if the provider is ready.
   */
  isReady?(): boolean

  /**
   * Registers a callback for when the provider is ready.
   */
  onReady?(callback: () => void): () => void
}

/**
 * Standalone translate function signature matching `I18nProvider.t()`.
 */
export type TranslateFunction = (
  key: string,
  values?: InterpolationValues,
  options?: { defaultValue?: string; count?: number },
) => string

/**
 * Options for the translate function (default value, pluralization count).
 */
export type TranslateOptions = { defaultValue?: string; count?: number }
