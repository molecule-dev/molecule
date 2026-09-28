/**
 * S3-compatible static-site deploy target for molecule.dev.
 *
 * Implements `@molecule/api-deploy-target` for apps with no server — a
 * prerendered site or a client-routed SPA — by publishing the build output to
 * a publicly readable bucket on any S3-compatible store (Tigris, Cloudflare R2,
 * AWS S3, MinIO). No machine is created, nothing boots, nothing idles: a deploy
 * is N object PUTs plus one manifest, and removing a site is a prefix delete.
 *
 * Each deploy is an immutable release under
 * `<keyPrefix><siteId>/<releaseId>/` — `files/<path>` for every file and
 * `manifest.json` (a `StaticSiteManifest`) written LAST, so a release whose
 * manifest exists is complete. The release's `origin` is
 * `{ kind: 'static-files', filesBaseUrl, manifestUrl }` — public URLs an edge
 * serves the site from.
 *
 * @remarks
 * - **The bucket must be publicly readable**, and `publicBaseUrl` must be the
 *   URL its objects are served at (`https://<bucket>.fly.storage.tigris.dev`,
 *   `https://pub-<id>.r2.dev`). The object store itself is not the web server:
 *   it has no directory indexes, base paths or SPA fallback, so put an edge in
 *   front that reads the manifest (see `@molecule/api-deploy-target`) — do not
 *   hand visitors `filesBaseUrl` links.
 * - **Every file is given site-relative** (`/index.html`, `/assets/x.js`) even
 *   when the site is built for a base path — the base goes in
 *   `routing.basePath`. `/index.html` is required; a path with `..`, `.`, an
 *   empty segment, a backslash or a trailing slash is REFUSED, not normalized.
 * - **A failed or cancelled deploy removes what it uploaded** and rejects
 *   (`error.code === 'cancelled'` for a cancellation); it never touches an
 *   earlier release. After switching traffic to a new release, reclaim the
 *   others with `remove(siteId, { keepReleaseIds: [releaseId] })`.
 * - Uses its OWN credentials (`DEPLOY_TARGET_S3_*` for the env-configured
 *   `provider`, or `createS3DeployTarget(config)`), never the `AWS_*` ones an
 *   app's uploads bucket uses — publishing sites and storing user uploads are
 *   different buckets with different access.
 * - Checksums are sent only where S3 requires them, because some S3-compatible
 *   stores reject the SDK's default CRC32 trailers on PUT. Egress honours
 *   `HTTPS_PROXY`/`NO_PROXY` through `@molecule/api-proxy-agent`.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-deploy-target'
 * import { createS3DeployTarget } from '@molecule/api-deploy-target-s3'
 *
 * setProvider('static', createS3DeployTarget({
 *   bucket: 'my-sites',
 *   publicBaseUrl: 'https://my-sites.fly.storage.tigris.dev',
 *   endpoint: 'https://fly.storage.tigris.dev',
 *   accessKeyId: process.env.SITES_KEY_ID,
 *   secretAccessKey: process.env.SITES_SECRET,
 * }))
 *
 * // Or configure from DEPLOY_TARGET_S3_* env vars:
 * import { provider } from '@molecule/api-deploy-target-s3'
 * setProvider('static', provider)
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './content-types.js'
export * from './provider.js'
export * from './types.js'
