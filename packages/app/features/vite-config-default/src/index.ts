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
 * **Dev-server host exposure is environment-detected: molecule sandbox vs
 * standalone machine.** Inside a molecule preview container (`/etc/mol`
 * exists, or `VITE_HOST` is set) the dev server binds `0.0.0.0` with
 * `allowedHosts: true` and `fs.strict: false` — the IDE preview iframe on
 * the host must reach it by IP/internal hostname, and modules resolve
 * through workspace symlinks outside the project root. Everywhere else
 * (a developer's machine running `npm run dev`) those settings are the
 * LAN-exposure + DNS-rebinding + `/@fs/` file-read triad, so standalone
 * defaults are `host: 'localhost'`, Vite's Host allowlist (localhost
 * variants, extended via `VITE_ALLOWED_HOSTS=myapp.test,dev.lan`;
 * `VITE_ALLOWED_HOSTS=*` disables Host checking entirely), and Vite's
 * strict `fs` confinement. `VITE_HOST` overrides the bind address in both
 * modes.
 *
 * Env conventions the config reads: `VITE_PORT` (dev port, default 3000),
 * `VITE_HOST` (explicit bind address — also selects sandbox behavior),
 * `VITE_ALLOWED_HOSTS` (standalone Host-allowlist extension),
 * `VITE_API_URL` (proxy target for /api,
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
 * The config also carries vitest's `test.exclude`, keeping the Playwright
 * suite under `e2e/` out of `npm test` (`vitest run`): Playwright specs are
 * `*.spec.ts`, which vitest's default include would otherwise collect and
 * fail. Put unit tests under `src/` and Playwright specs under `e2e/`
 * (`playwright.config.ts` → `testDir: './e2e'`); if you override
 * `test.exclude`, keep the `**\/e2e/**` entry.
 *
 * @module
 */

export * from './config.js'
export * from './push-sw.js'
