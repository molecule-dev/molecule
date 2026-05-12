/**
 * `@molecule/app-pwa-default` — drop-in PWA service worker registration
 * with update banner, multi-tab coordination, and i18n-localized labels.
 *
 * Apps' `src/pwa.ts` shrinks from 147 lines to a 1-line re-export.
 *
 * @example
 * ```ts
 * // src/pwa.ts
 * export { registerPWA } from '@molecule/app-pwa-default'
 * ```
 *
 * @module
 */

export * from './registerPWA.js'
