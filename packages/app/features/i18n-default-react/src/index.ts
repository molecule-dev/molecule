/**
 * `@molecule/app-i18n-default-react` — default i18n bond setup.
 *
 * Bundles the 80-language fleet definitions + `setupI18nDefault()`
 * helper that wires the molecule i18n provider with English bootstrap,
 * lazy-loading for every other locale, common-bond translation merging,
 * and locale persistence via the bonded storage provider.
 *
 * Replaces the 113-line `bonds/i18n-default.ts` that every flagship
 * app shipped byte-identically.
 *
 * @example
 * ```ts
 * import { t } from '@molecule/app-i18n'
 * import { setupI18nDefault } from '@molecule/app-i18n-default-react'
 *
 * // The app's own UI strings — in a scaffolded app these are `src/locales/<code>/ui.ts`.
 * const enUi = { 'trips.title': 'My trips' }
 * const uiByLocale: Record<string, Record<string, string>> = {
 *   es: { 'trips.title': 'Mis viajes' },
 * }
 *
 * const i18n = setupI18nDefault({
 *   enUi,
 *   lazyLoadUi: async (code) => uiByLocale[code] ?? {},
 *   supportedLocales: ['es'],
 * })
 *
 * t('trips.title') // 'My trips'
 * t('common.close') // 'Close' — the common bond is merged in automatically
 * await i18n.setLocale('es')
 * t('trips.title') // 'Mis viajes'
 * t('common.close') // 'Cerrar'
 * ```
 *
 * @remarks
 * - Call it ONCE at startup, before rendering: it creates the provider AND
 *   bonds it (`setProvider`), so `t()` from `@molecule/app-i18n` works right
 *   away. Pass the returned provider to `@molecule/app-react`'s
 *   `<I18nProvider provider={...}>` so components re-render on locale change.
 * - Only English is loaded eagerly. Every other locale loads through
 *   `lazyLoadUi(code)` on `setLocale()`; in a Vite app make it a dynamic
 *   `import()` of `../locales/<code>/ui.ts` returning its `ui` export, so each
 *   language is its own chunk. A loader that returns `{}` (or rejects) marks the locale
 *   UNSUPPORTED and it is removed from `getLocales()` — pass
 *   `supportedLocales` to skip that async probe (`'en'` is always kept).
 * - `@molecule/app-locales-common` (`common.*`, `home.*`, …) is merged
 *   automatically; other packages' companion bonds are NOT — star-import each
 *   (`import * as authLocales from '@molecule/app-locales-auth'`) and pass
 *   `packageLocales: [authLocales]`. App `enUi` / `lazyLoadUi` keys win over bond keys.
 * - The chosen locale is persisted through `@molecule/app-storage` under
 *   `molecule-locale` only if a storage provider is bonded; otherwise
 *   persistence is silently skipped. Despite the name, it does not import React.
 *
 * @module
 */

export * from './languages.js'
export * from './setup.js'
