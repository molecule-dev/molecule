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
 * Key-value map of interpolation variables for server-side translation strings.
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
 * Server-side locale configuration (code, display name, text direction, translations or loader).
 */
export interface LocaleConfig {
  /**
   * Locale code (e.g., 'en', 'fr', 'zh-TW').
   */
  code: string

  /**
   * Display name (e.g., 'English', 'Francais').
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
  setLocale(locale: string): void

  /**
   * Gets all available locales.
   */
  getLocales(): LocaleConfig[]

  /**
   * Adds a locale.
   */
  addLocale(config: LocaleConfig): void

  /**
   * Adds translations to a locale. Auto-creates the locale if it doesn't exist.
   */
  addTranslations(locale: string, translations: Translations, namespace?: string): void

  /**
   * Translates a key.
   */
  t(
    key: string,
    values?: InterpolationValues,
    options?: { defaultValue?: string; count?: number; locale?: string },
  ): string

  /**
   * Checks if a translation exists.
   */
  exists(key: string): boolean

  /**
   * Formats a number.
   */
  formatNumber(value: number, options?: NumberFormatOptions): string

  /**
   * Formats a date.
   */
  formatDate(value: Date | number | string, options?: DateFormatOptions): string

  /**
   * Formats a relative time (e.g., "2 hours ago").
   */
  formatRelativeTime(value: Date | number, options?: { unit?: Intl.RelativeTimeFormatUnit }): string

  /**
   * Formats a list (e.g., "A, B, and C").
   */
  formatList(values: string[], options?: { type?: 'conjunction' | 'disjunction' | 'unit' }): string

  /**
   * Gets the text direction for the current locale.
   */
  getDirection(): 'ltr' | 'rtl'
}

/**
 * Translate Function type.
 */
export type TranslateFunction = (
  key: string,
  values?: InterpolationValues,
  options?: { defaultValue?: string; count?: number; locale?: string },
) => string

/**
 * Translate Options type.
 */
export type TranslateOptions = { defaultValue?: string; count?: number; locale?: string }
