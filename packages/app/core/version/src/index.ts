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
 *   dismissUpdate,
 *   getProvider,
 *   setCurrentVersion,
 *   startPeriodicChecks,
 * } from '@molecule/app-version'
 * import type { VersionInfo, VersionState } from '@molecule/app-version'
 *
 * // Startup — the values baked into THIS build (empty strings = updates are never detected):
 * setCurrentVersion({
 *   buildId: import.meta.env.VITE_BUILD_ID,
 *   version: import.meta.env.VITE_APP_VERSION,
 * })
 *
 * let bannerVisible = false
 * const stopListening = getProvider().on<{ current: VersionState; new: VersionInfo }>(
 *   'update-available',
 *   (update) => {
 *     bannerVisible = true // render your own "New version — Reload" banner (t() + getClassMap())
 *     console.log(update.current.version, '→', update.new.version) // '1.4.0' → '1.5.0'
 *   },
 * )
 *
 * startPeriodicChecks({ immediate: true, interval: 5 * 60_000 }) // ms; fetches same-origin /version.json
 *
 * // The banner's buttons — the user opts in; never reload unprompted:
 * const onReloadClick = (): void => applyUpdate() // reloads (activates a waiting service worker first)
 * const onLaterClick = (): void => {
 *   dismissUpdate()
 *   bannerVisible = false
 * }
 * // On teardown: stopListening()
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
 * - The checker ALWAYS fetches `/version.json` — `UpdateCheckOptions.versionUrl` is currently
 *   ignored, so serve the file at exactly that path. `interval` is in MILLISECONDS
 *   (default 5 min); fetch errors only emit `check-error`, they never throw.
 * - `dismissUpdate()` only clears `isUpdateAvailable` — the next periodic check still sees
 *   the newer build and emits `update-available` again. `on()` returns an unsubscribe
 *   function; handlers receive `{ current: VersionState, new: VersionInfo }`.
 * - `service-worker-template.ts` generates service-worker SOURCE at scaffold time
 *   (precache + push handlers); it is not a runtime service worker itself.
 *
 * @module
 */

export * from './checker.js'
export * from './provider.js'
export * from './service-worker.js'
export * from './service-worker-template.js'
export * from './types.js'
export * from './utilities.js'
