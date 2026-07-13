/**
 * `@molecule/app-service-worker-default` — drop-in workbox SW setup.
 *
 * App-shell navigation routing, image cache with StaleWhileRevalidate,
 * precache manifest from vite-plugin-pwa, and a SKIP_WAITING message
 * handler. The token `__WB_MANIFEST` is still referenced inside the
 * app's per-app `service-worker.ts` so vite-plugin-pwa's build-time
 * injection finds it correctly.
 *
 * @example
 * ```ts
 * /// <reference lib="webworker" />
 * import { setupDefaultServiceWorker } from '@molecule/app-service-worker-default'
 *
 * // Must live in the app's own src/service-worker.ts so vite-plugin-pwa's
 * // build-time injection finds the `__WB_MANIFEST` token.
 * const sw = self as unknown as ServiceWorkerGlobalScope & {
 *   __WB_MANIFEST: Array<{ url: string; revision: string | null }>
 * }
 *
 * setupDefaultServiceWorker(sw, sw.__WB_MANIFEST)
 * ```
 *
 * @module
 */

export * from './setup.js'
