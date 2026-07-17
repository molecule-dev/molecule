/**
 * `@molecule/app-service-worker-default` — drop-in Workbox service-worker
 * setup.
 *
 * Exports `setupDefaultServiceWorker(worker, manifest, options?)`, the
 * `PrecacheEntry` type, and `DEFAULT_IMAGE_EXTENSIONS`. Wires: precache
 * manifest, app-shell navigation fallback (base-path aware — derived from
 * `self.registration.scope`, overridable), a same-origin image cache for all
 * common web formats (png/jpg/jpeg/webp/avif/gif/svg/ico, StaleWhileRevalidate,
 * max 50 entries), `clientsClaim()`, and a SKIP_WAITING message handler.
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
 * - Navigation fallback is base-path aware: by default it resolves `index.html`
 *   against `self.registration.scope`, so an app built with a non-root Vite
 *   `base` (e.g. served under `/app/`) falls back to `/app/index.html`
 *   automatically. Override via `options.navigationFallback` when needed.
 * - The image cache matches same-origin requests for all common web image
 *   formats (png/jpg/jpeg/webp/avif/gif/svg/ico) case-insensitively. Narrow or
 *   widen the set via `options.imageExtensions`.
 * - Navigations to paths starting with `/_` or containing a file extension
 *   bypass the app-shell fallback.
 *
 * @module
 */

export * from './setup.js'
