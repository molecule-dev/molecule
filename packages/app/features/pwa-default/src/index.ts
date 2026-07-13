/**
 * `@molecule/app-pwa-default` — drop-in PWA service worker registration
 * with update banner, multi-tab coordination, and i18n-localized labels.
 *
 * Apps' `src/pwa.ts` shrinks from 147 lines to a 1-line re-export.
 *
 * @example
 * ```ts
 * // src/pwa.ts is a 1-line re-export:
 * //   export { registerPWA } from '@molecule/app-pwa-default'
 * // then call it once at app startup (e.g. in main.tsx):
 * import { registerPWA } from '@molecule/app-pwa-default'
 *
 * registerPWA()
 * ```
 *
 * @module
 */

export * from './registerPWA.js'
