/**
 * `@molecule/app-service-worker-default` — drop-in Workbox service-worker
 * setup.
 *
 * Exports `setupDefaultServiceWorker(worker, manifest)` and the
 * `PrecacheEntry` type. Wires: precache manifest, app-shell navigation
 * fallback to `/index.html`, a same-origin PNG image cache
 * (StaleWhileRevalidate, max 50 entries), `clientsClaim()`, and a
 * SKIP_WAITING message handler.
 *
 * @example
 * ```ts
 * /// <reference lib="webworker" />
 * import { setupDefaultServiceWorker } from '@molecule/app-service-worker-default'
 *
 * // Must live in the app's own src/service-worker.ts so the build-time
 * // manifest injection finds the __WB_MANIFEST token in the SW source.
 * const sw = self as unknown as ServiceWorkerGlobalScope & {
 *   __WB_MANIFEST: Array<{ url: string; revision: string | null }>
 * }
 *
 * setupDefaultServiceWorker(sw, sw.__WB_MANIFEST)
 * ```
 *
 * @remarks
 * - This is only the SW-file half: the app must also REGISTER the worker
 *   (vite-plugin-pwa's `registerSW()`, or
 *   `navigator.serviceWorker.register('/service-worker.js')` on load) —
 *   nothing here registers anything.
 * - Works with any Workbox InjectManifest-compatible build (vite-plugin-pwa
 *   `injectManifest`, workbox-webpack-plugin, workbox-cli). The
 *   `__WB_MANIFEST` token must appear in YOUR SW source file — it is not
 *   inside this package.
 * - All five `workbox-*` packages are peerDependencies — install
 *   `workbox-core`, `workbox-expiration`, `workbox-precaching`,
 *   `workbox-routing`, `workbox-strategies` in the app.
 * - Navigation fallback is hardcoded to `/index.html` — apps served under a
 *   sub-path (build `base` other than `/`) need their own handler.
 * - The image cache matches same-origin `.png` requests ONLY; jpg/svg/webp
 *   are not cached — register additional routes for other formats.
 * - Navigations to paths starting with `/_` or containing a file extension
 *   bypass the app-shell fallback.
 *
 * @module
 */

export * from './setup.js'
