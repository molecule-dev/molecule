/**
 * `@molecule/app-vite-config-default` — drop-in Vite config factory.
 *
 * `createDefaultViteConfig({ APP_NAME, APP_DESCRIPTION, BRAND_COLOR })`
 * returns the canonical fleet vite config (react + tailwind + VitePWA,
 * molecule-package pre-bundle exclusion, /api + /health + /socket.io (ws)
 * proxy, etc.) Per-app `vite.config.ts` shrinks from 105 lines to 5.
 *
 * @example
 * ```ts
 * import { defineConfig } from 'vite'
 * import { createDefaultViteConfig } from '@molecule/app-vite-config-default'
 * import { APP_DESCRIPTION, APP_NAME, BRAND_COLOR } from './src/branding.js'
 *
 * export default defineConfig(createDefaultViteConfig({ APP_NAME, APP_DESCRIPTION, BRAND_COLOR }))
 * ```
 *
 * @module
 */

export * from './config.js'
export * from './push-sw.js'
