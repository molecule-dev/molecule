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
 * @remarks
 * Vite-only: imports the `virtual:pwa-register` module that vite-plugin-pwa
 * generates, so the `VitePWA()` plugin MUST be configured in vite.config.ts
 * (molecule scaffolds do this) — without it the import does not resolve and
 * the build fails. Not usable under other bundlers. Framework-agnostic at
 * runtime: the update banner is plain DOM (no React), themed via the app's
 * `--color-surface/--color-border/--color-foreground/--color-success` CSS
 * variables. Banner labels use the `pwa.update`, `pwa.updateAvailable`, and
 * `pwa.updating` keys from `@molecule/app-locales-common` — load that bond's
 * translations before the banner can appear, or the raw keys are shown.
 * Call `registerPWA()` exactly once at app startup; it is a no-op during SSR.
 *
 * @module
 */

export * from './registerPWA.js'
