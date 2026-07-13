/**
 * `@molecule/app-i18n-default-react` — default i18n bond setup.
 *
 * Bundles the 74-language fleet definitions + `setupI18nDefault()`
 * helper that wires the molecule i18n provider with English bootstrap,
 * lazy-loading for every other locale, common-bond translation merging,
 * and locale persistence via the bonded storage provider.
 *
 * Replaces the 113-line `bonds/i18n-default.ts` that every flagship
 * app shipped byte-identically.
 *
 * @example
 * ```ts
 * import { setupI18nDefault } from '@molecule/app-i18n-default-react'
 *
 * // `en` is the app's eagerly-imported English UI translations —
 * // in your app: `import { ui as en } from '../locales/en/ui.js'`.
 * // The lazy loader MUST stay in the app so Vite can code-split
 * // each locale's ui.ts into its own chunk.
 * const lazyLoadUi = (code: string) =>
 *   import(`../locales/${code}/ui.ts`).then((m) => m.ui)
 *
 * setupI18nDefault({ enUi: en, lazyLoadUi })
 * ```
 *
 * @module
 */

export * from './languages.js'
export * from './setup.js'
