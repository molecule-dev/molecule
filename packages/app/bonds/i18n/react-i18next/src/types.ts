/**
 * Type definitions for react-i18next provider.
 *
 * Re-exports all types from the base i18next provider.
 *
 * @module
 */

export type {
  DateFormatOptions,
  I18nextProviderConfig,
  I18nProvider,
  InterpolationValues,
  LocaleConfig,
  NumberFormatOptions,
  Translations,
} from '@molecule/app-i18n-i18next'

import type { I18nextProviderConfig } from '@molecule/app-i18n-i18next'

/**
 * Configuration options for the react-i18next provider.
 *
 * Identical to I18nextProviderConfig — the React-specific setup
 * (initReactI18next plugin, Suspense) is handled automatically.
 */
export type ReactI18nextProviderConfig = I18nextProviderConfig
