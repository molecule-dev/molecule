/**
 * Type definitions for i18next provider.
 *
 * @module
 */

import type { InitOptions } from 'i18next'

import type {
  DateFormatOptions,
  I18nProvider,
  InterpolationValues,
  LocaleConfig,
  NumberFormatOptions,
  Translations,
} from '@molecule/app-i18n'

// Re-export core types
export type {
  DateFormatOptions,
  I18nProvider,
  InterpolationValues,
  LocaleConfig,
  NumberFormatOptions,
  Translations,
}

/**
 * Configuration options for the i18next provider.
 */
export interface I18nextProviderConfig {
  /**
   * Default locale code.
   */
  defaultLocale?: string

  /**
   * Fallback locale code.
   */
  fallbackLocale?: string

  /**
   * Available locales with translations.
   */
  locales?: LocaleConfig[]

  /**
   * Enable language detection.
   */
  detection?: boolean

  /**
   * Language detection options.
   */
  detectionOptions?: {
    order?: (
      | 'querystring'
      | 'cookie'
      | 'localStorage'
      | 'sessionStorage'
      | 'navigator'
      | 'htmlTag'
    )[]
    lookupQuerystring?: string
    lookupCookie?: string
    lookupLocalStorage?: string
    lookupSessionStorage?: string
    caches?: ('localStorage' | 'cookie')[]
  }

  /**
   * Debug mode.
   */
  debug?: boolean

  /**
   * Custom i18next initialization options.
   */
  i18nextOptions?: Partial<InitOptions>

  /**
   * i18next plugins to apply before initialization.
   *
   * Each plugin is passed to `i18n.use()` before `i18n.init()`.
   * Useful for framework integrations (e.g. react-i18next's `initReactI18next`).
   */
  plugins?: unknown[]
}
