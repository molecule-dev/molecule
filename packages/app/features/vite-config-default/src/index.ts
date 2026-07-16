/**
 * `@molecule/app-vite-config-default` — drop-in Vite config factory.
 *
 * `createDefaultViteConfig({ APP_NAME, APP_DESCRIPTION, BRAND_COLOR })`
 * returns the canonical fleet vite config (react + tailwind + VitePWA,
 * molecule-package pre-bundle exclusion, /api + /health + /socket.io (ws)
 * proxy, push service worker). Per-app `vite.config.ts` shrinks from 105
 * lines to 5. Also exports `moleculePushServiceWorkerPlugin` /
 * `PUSH_SW_FILENAME` / `PUSH_SW_SOURCE` (the web-push half of the
 * generated service worker).
 *
 * @example
 * ```ts
 * import { defineConfig } from 'vite'
 *
 * import { createDefaultViteConfig } from '@molecule/app-vite-config-default'
 *
 * // In a scaffolded app these come from './src/branding.js'.
 * const APP_NAME = 'Acme'
 * const APP_DESCRIPTION = 'Acme dashboard'
 * const BRAND_COLOR = '#6750a4'
 *
 * // The app's vite.config.ts wraps this exact call in `export default`.
 * const config = defineConfig(createDefaultViteConfig({ APP_NAME, APP_DESCRIPTION, BRAND_COLOR }))
 * ```
 *
 * @remarks
 * Env conventions the config reads: `VITE_PORT` (dev port, default 3000),
 * `VITE_HOST` (default 0.0.0.0), `VITE_API_URL` (proxy target for /api,
 * /health, /socket.io; defaults to http://localhost:PORT with PORT
 * defaulting to 4000), `VITE_CACHE_DIR` (per-app Vite cache dir — under
 * workspace-symlinked node_modules the default cache is shared machine-wide
 * and corrupts under concurrent dev servers), and `VITE_OPEN=false` or
 * `BROWSER=none` to stop the dev server auto-opening a browser tab (vite's
 * `--open` flag takes no value — from automation, use the env vars).
 *
 * Every `@molecule/*` package is EXCLUDED from dependency pre-bundling
 * (bond state lives in module-level singletons; pre-bundling duplicates
 * them and silently breaks `bond()` wiring) — EXCEPT
 * `@molecule/app-locales-*` bonds, which are force-included because they
 * are pure data and unbundled they fan out into thousands of dev-server
 * module requests. `react`, `react-dom`, `react-router` and
 * `react-router-dom` sit in `resolve.dedupe`; when a `@molecule/*-react`
 * package calls hooks from another peer library (zustand,
 * `@tanstack/react-query`, ...), that library must be added to dedupe too or
 * two module instances break its React context. A CJS dep that crashes
 * with "does not provide an export named 'default'" should be declared as
 * `"molecule": { "viteOptimizeInclude": ["<dep>"] }` in the package.json
 * of the `@molecule` package that OWNS the dep — this factory aggregates all
 * such declarations into `optimizeDeps.include` automatically.
 *
 * The factory takes no options beyond branding — extend the result with
 * vite's `mergeConfig(createDefaultViteConfig(branding), overrides)`.
 * The PWA build emits `push-sw.js` and importScripts it into the Workbox
 * generateSW worker so delivered web-push notifications actually display.
 *
 * @module
 */

export * from './config.js'
export * from './push-sw.js'
