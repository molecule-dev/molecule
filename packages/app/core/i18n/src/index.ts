/**
 * Internationalization (i18n) interface for molecule.dev.
 *
 * Provides a unified API for translations and localization that works
 * with different i18n libraries (react-i18next, FormatJS, etc.).
 * Catalog messages containing `p`, `h2`, `ul`, `li` and `strong` can use
 * `tRich()` outside a component or the framework binding's `useRichTranslation()`
 * in a component. Both return nodes with interpolated values in text.
 *
 * @example
 * A component reads `t` from its framework binding's `useTranslation()` (here
 * `@molecule/app-react`; `-vue`, `-solid`, `-svelte` and `-angular` export the same
 * hook), so its text changes language at once on a locale switch:
 * ```tsx
 * import { useTranslation } from '@molecule/app-react'
 *
 * function SaveButton() {
 *   const { t } = useTranslation()
 *   // ALWAYS pass a defaultValue — it renders immediately as the English text.
 *   return <button>{t('settings.save', undefined, { defaultValue: 'Save' })}</button>
 * }
 * ```
 *
 * @example
 * Code outside a component that produces text once, at the moment it runs (a
 * notification fired from a handler), calls this package's `t`:
 * ```ts
 * import { t } from '@molecule/app-i18n'
 *
 * notify(t('settings.saved', undefined, { defaultValue: 'Settings saved.' }))
 * ```
 *
 * @remarks
 * Never render this package's `t` inside a component: it does not re-render the
 * component when the locale changes, so the text stays in the old language. An
 * error is thrown as an {@link I18nError} (the key, not translated text), so the
 * component that shows it translates it in the current locale.
 *
 * Every user-visible string must go through `t()` — never hardcode UI text. And
 * ALWAYS supply `{ defaultValue: 'English text' }`: a bare `t('settings.save')`
 * renders the raw key in the UI until a translation loads.
 *
 * This is what makes a string a test suite (or a contract document) pins
 * verbatim cheap to satisfy: write it on the FIRST pass as
 * `t('article.favorited', undefined, { defaultValue: 'Favorited' })`. The
 * default renders exactly that English, so the markup is right immediately and
 * the page has text while its dictionaries load. Add the key to the app's
 * `locales/<code>/ui.ts` files or the owning locale bond. Custom scaffolds
 * register their catalogs with {@link TranslationCatalogs}. The editor and
 * build then report which translation each offered locale is missing.
 *
 * Interpolation tokens use **DOUBLE braces** `{{var}}` — in BOTH the
 * `defaultValue` and any matching locale-file entry:
 * `t('hero', { tagline }, { defaultValue: 'Eat well — {{tagline}}' })` and
 * `heroTitle: 'Eat well — {{tagline}}'`. The simple provider also fills a
 * single-brace `{var}` when `var` is one of the values you passed (a common slip
 * that used to render "{var}" on the page), but other providers (i18next) do
 * not, so write double braces.
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
 *   locale, then fallback locale), so it agrees with whether `t(key)` renders real
 *   translated text.
 *
 * @module
 */

export * from './error.js'
export * from './plural.js'
export * from './provider.js'
export * from './rich.js'
export * from './translator.js'
export * from './types.js'
export * from './utilities.js'
