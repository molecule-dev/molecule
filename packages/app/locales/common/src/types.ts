/**
 * Shared `common.*` translation keys used by every molecule.dev app.
 *
 * Each key has a single canonical value per language; values harvested
 * from the existing fleet locale files (133 apps × 73 languages,
 * identical per-language) and lifted out so apps don't have to ship
 * the same strings in every locale file.
 *
 * Apps that need a different value for a particular key can still
 * override per-call by passing a `defaultValue` to `t()` or by adding
 * a later-merged entry in their own locale files — the i18n provider
 * keeps the last-merged value.
 *
 * @module
 */

export interface CommonTranslations {
  /** Generic close action (modal/drawer dismiss buttons, etc.). */
  'common.close': string
  /** Forward step in a multi-step flow (onboarding, wizards). */
  'common.continue': string
  /** Backward step / return to previous screen. */
  'common.goBack': string
  /** Generic loading state copy. */
  'common.loading': string
  /** Generic save-in-progress state copy. */
  'common.saving': string
  /** Generic form submit button label. */
  'common.submit': string
}
