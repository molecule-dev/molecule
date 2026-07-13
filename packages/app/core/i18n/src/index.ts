/**
 * Internationalization (i18n) interface for molecule.dev.
 *
 * Provides a unified API for translations and localization that works
 * with different i18n libraries (react-i18next, FormatJS, etc.).
 *
 * @example
 * ```tsx
 * import { t } from '@molecule/app-i18n'
 * // ALWAYS pass a defaultValue — it renders immediately as the English text.
 * <button>{t('settings.save', undefined, { defaultValue: 'Save' })}</button>
 * ```
 *
 * @remarks
 * Every user-visible string must go through `t()` — never hardcode UI text. And
 * ALWAYS supply `{ defaultValue: 'English text' }`: a bare `t('settings.save')`
 * renders the raw KEY string ("settings.save") in the UI until a translation for
 * that key loads, so the default is what the user actually sees. Translation keys
 * are optional polish layered on top; the `defaultValue` is the real copy. Add
 * keys to the app's `locales/en/ui.ts` (and per-locale `{code}/ui.ts`) — not in
 * feature packages.
 *
 * Interpolation tokens use **DOUBLE braces** `{{var}}`, never single `{var}` — a
 * single brace is NOT interpolated and renders LITERALLY (you see "{name}" on the
 * page). This applies to BOTH the `defaultValue` and any matching locale-file
 * entry: `t('hero', { tagline }, { defaultValue: 'Eat well — {{tagline}}' })` and
 * `heroTitle: 'Eat well — {{tagline}}'`. The locale entry takes priority over the
 * `defaultValue`, so a single-brace locale entry shows `{tagline}` even when the
 * default is correct — the #1 i18n footgun.
 *
 * **Fleet provider contract** (every `I18nProvider` — this package's own
 * `createSimpleI18nProvider`, `@molecule/api-i18n-simple`,
 * `@molecule/app-i18n-i18next`, `@molecule/app-i18n-react-i18next` — must
 * behave identically; see the JSDoc on each `I18nProvider` method for the
 * normative text):
 *
 * - `setLocale()` THROWS for an unregistered locale — never silently
 *   degrades to fallback text while `getLocale()` reports the bad code.
 * - `t()` prefers the plural-suffixed key (`key_one`/`key_other`/…) over the
 *   base `key` whenever `options.count` is provided (matches i18next).
 * - `addTranslations()` deep-merges nested translation objects.
 * - `exists(key)` follows the same locale-fallback chain as `t()` (active
 *   locale, then English), so it agrees with whether `t(key)` renders real
 *   translated text.
 *
 * @module
 */

export * from './error.js'
export * from './plural.js'
export * from './provider.js'
export * from './translator.js'
export * from './types.js'
export * from './utilities.js'
