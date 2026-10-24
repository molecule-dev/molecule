/**
 * Version and update management interface for molecule.dev.
 *
 * Tracks the running build, polls a same-origin `/version.json` for new deploys,
 * manages the service-worker update lifecycle (waiting worker, skip-waiting,
 * reload), and emits events. Headless: the app owns the "update available"
 * banner/toast — styled via `getClassMap()` and translated via `t()` — while this
 * package owns detection, apply, and dismiss.
 *
 * @example
 * ```typescript
 * import {
 *   applyUpdate,
 *   getProvider,
 *   setCurrentVersion,
 *   startPeriodicChecks,
 * } from '@molecule/app-version'
 *
 * // At startup — build-time values injected by the bundler:
 * setCurrentVersion({ buildId: __BUILD_ID__, version: __APP_VERSION__ })
 * startPeriodicChecks({ immediate: true }) // polls /version.json (default: every 5 min)
 *
 * // Render your own update UI from events:
 * getProvider().on('update-available', () => {
 *   showUpdateBanner({ onReload: () => applyUpdate() })
 * })
 * ```
 *
 * @remarks
 * - **No bond wiring needed on the web.** `getProvider()` auto-creates a
 *   browser-based provider on first access; call `setProvider()` only to
 *   substitute a custom/native implementation.
 * - **Update detection has TWO prerequisites this package does not create:**
 *   (1) `setCurrentVersion()` must run at startup with real build-time values —
 *   the checker only reports an update when the CURRENT `buildId`/`version` is
 *   non-empty and differs from the remote; (2) the app must serve `/version.json`
 *   (same-origin, `VersionInfo` shape: `{ buildId, version, … }`) and regenerate
 *   it on every deploy. Miss either and checks silently never find an update.
 * - **`applyUpdate()` reloads the page** (activating a waiting service worker
 *   first when present). Surface the `update-available` event in UI and let the
 *   user opt in — never call it unprompted; unsaved state is lost on reload.
 * - **"What's new" line for the banner.** `getUpdateSummary()` returns one short
 *   line for the waiting update — the change's own description when there is
 *   one change, else counts ("3 new features, 2 bugs fixed, and performance
 *   improvements") — as `{ text, compact }` (`compact`: "3 features, 2 fixes,
 *   faster", for when `text` does not fit), or `null`. It needs the build plugin:
 *   `import { releaseNotesPlugin } from '@molecule/app-version/build'` in
 *   `vite.config.ts` (`@molecule/app-vite-config-default` already includes it).
 *   The plugin reads the app directory's conventional commits (`feat:`, `fix:`,
 *   `perf:`; `test`/`ci`/`docs`/`style`/`build` are skipped) into
 *   `release-notes.json` and stamps the build's commit time into `index.html`.
 *   A `Release-Note: <text>` commit trailer replaces the description shown;
 *   `Release-Note: none` leaves the commit out. Labels use the `version.summary.*`
 *   keys from `@molecule/app-locales-version`.
 * - `service-worker-template.ts` generates service-worker SOURCE at scaffold time
 *   (precache + push handlers); it is not a runtime service worker itself.
 *
 * @module
 */

export * from './checker.js'
export * from './provider.js'
export * from './release-notes.js'
export * from './service-worker.js'
export * from './service-worker-template.js'
export * from './types.js'
export * from './utilities.js'
