/**
 * Deploy target core interface for molecule.dev.
 *
 * A deploy target is where a BUILT app is published so the public can reach
 * it. This package defines the one contract every target implements —
 * `deploy(request) → release` and `remove(siteId)` — so where an app is hosted
 * is a choice of bond, not a code change: a prerendered blog goes to static
 * object storage, an app with an API goes to a machine that runs its server,
 * and switching one app between them is a different `requireProvider(name)`.
 *
 * Interface only. Bond targets by NAME at startup (`setProvider('static', …)`,
 * `setProvider('machine', …)`) and pick one per deploy.
 *
 * Bonds:
 * - `@molecule/api-deploy-target-s3` — static files on any S3-compatible bucket
 *   (Tigris, Cloudflare R2, AWS S3, MinIO), one immutable prefix per release
 *   plus a manifest an edge serves from.
 *
 * @remarks
 * - **Choose the target from what the app IS, and let the owner override it.**
 *   The facts are known before the deploy starts — whether the app has a
 *   server, whether it needs a database — so pass them in; never probe a
 *   deployed site to find out. A `static-files` target can host only an app
 *   with no server at all: a prerendered site (`unmatchedPaths: 'not-found'`)
 *   or a client-routed SPA (`unmatchedPaths: 'serve-index'`). Anything with an
 *   API needs an `app-server` target.
 * - **Releases are immutable.** Every deploy publishes a NEW `releaseId`; the
 *   previous release keeps serving until the caller switches its routing to the
 *   new one. Only then reclaim the old ones with
 *   `remove(siteId, { keepReleaseIds: [current] })` — and not in the same
 *   instant if an edge caches the old origin for a few seconds.
 * - **`basePath` is part of the build, not of the host.** A site built for
 *   `/blog` emits `/blog/assets/…` URLs; pass the SAME base the build used
 *   (read it from the build's own environment), or every asset 404s. Files
 *   are still given site-relative (`/index.html`, not `/blog/index.html`).
 * - **A `static-files` origin is not a web server.** Object stores do not do
 *   directory indexes, base paths or fallbacks. Whatever serves the files reads
 *   the release's `StaticSiteManifest` (fetched once per release — it never
 *   changes) and answers `/blog/` → `/index.html`, `/about/` →
 *   `/about/index.html`, an unmatched path → `/index.html` or `/404.html`,
 *   fetching only files the manifest names.
 * - **Values a static bundle needs must exist at BUILD time.** `env` on the
 *   request reaches only server targets; a bundler inlines `VITE_*`/public
 *   values when it builds, and nothing can change them afterwards.
 * - `remove()` on a failed listing THROWS — "could not look" must never read as
 *   "nothing to remove" to a caller that is tearing a project down.
 *
 * @example
 * ```typescript
 * import { requireProvider, setProvider } from '@molecule/api-deploy-target'
 * import { createS3DeployTarget } from '@molecule/api-deploy-target-s3'
 *
 * // At startup:
 * setProvider('static', createS3DeployTarget({
 *   bucket: 'my-sites',
 *   endpoint: 'https://fly.storage.tigris.dev',
 *   publicBaseUrl: 'https://my-sites.fly.storage.tigris.dev',
 * }))
 *
 * // Per deploy — the caller knows what the app is:
 * const target = requireProvider(app.hasServer ? 'machine' : 'static')
 * const release = await target.deploy({
 *   siteId: app.id,
 *   releaseId: Date.now().toString(36),
 *   files, // [{ path: '/index.html', body }, …] from the build output
 *   routing: { basePath: '/blog', unmatchedPaths: 'not-found' },
 * })
 * // Route the app's public host to release.origin, then reclaim old releases:
 * await target.remove(app.id, { keepReleaseIds: [release.releaseId] })
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
