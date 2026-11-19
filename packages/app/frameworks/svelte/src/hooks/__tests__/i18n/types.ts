/**
 * Types the i18n probe components and their tests share.
 *
 * @module
 */

import type { LocaleConfig } from '@molecule/app-i18n'

import type { UseTranslationResult } from '../../useTranslation.js'

/**
 * What one `useTranslation()` evaluation showed: the translation function it
 * used, the locales list it read, and the text it rendered.
 */
export interface RunSnapshot {
  /** The translation function this evaluation read. */
  t: UseTranslationResult['t']
  /** The locales list this evaluation read. */
  locales: LocaleConfig[]
  /** The text this evaluation rendered. */
  text: string
}

/** What one `TranslationDetail` evaluation showed. */
export interface DetailEntry {
  /** The locale the evaluation read. */
  locale: string
  /** The direction the evaluation read. */
  direction: string
  /** The translated text, without the locale/direction prefix. */
  text: string
}
