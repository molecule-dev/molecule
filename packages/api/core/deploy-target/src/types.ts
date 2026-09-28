/**
 * Deploy target types.
 *
 * A deploy target is a place a BUILT app is published to so the public can
 * reach it: a bucket of static files behind an edge, a long-lived machine
 * running the app's server, a third-party host. Every target takes the same
 * {@link DeployTargetRequest} and answers with the same
 * {@link DeployTargetRelease}, so switching where an app is hosted is a choice
 * of bond name, not a code change.
 *
 * @module
 */

/**
 * What kind of app a target can host.
 *
 * - `static-files` — serves the build output as files and nothing else. No
 *   server process, no database, no websockets. A prerendered site or a
 *   client-routed single-page app fits; anything with an API does not.
 * - `app-server` — runs the app's own server process (and whatever it needs
 *   beside it), so it can host anything a static target can plus an API.
 */
export type DeployTargetHosts = 'static-files' | 'app-server'

/**
 * One file of the build output.
 *
 * `path` is SITE-RELATIVE with a leading slash (`/index.html`,
 * `/assets/app-3f2a.js`, `/blog/post/index.html`) — the path a visitor would
 * request if the site were mounted at the root. Never `..`, never a backslash,
 * never empty segments; a target must refuse such a path rather than normalize
 * it, because a normalized path is a file the caller did not ask for.
 */
export interface DeployTargetFile {
  /** Site-relative path with a leading slash, e.g. `/index.html`. */
  path: string
  /** The file's bytes, exactly as they should be served. */
  body: Uint8Array
  /**
   * The `Content-Type` to serve it with. Optional: a target derives one from
   * the extension when absent (`application/octet-stream` for an unknown one).
   */
  contentType?: string
}

/**
 * What a request for a path the build did not produce gets.
 *
 * - `serve-index` — the build's `/index.html`, status 200. For a client-routed
 *   single-page app, whose router owns every path.
 * - `not-found` — status 404, with the build's own `/404.html` when it emitted
 *   one. For a prerendered site, which emits a file per route, so an unmatched
 *   path is simply missing.
 *
 * Decided by what the BUILD is — the caller knows, so it says so. It never
 * depends on who is asking (an `Accept: text/html` browser and a feed reader
 * get the same answer for the same path).
 */
export type DeployUnmatchedPaths = 'serve-index' | 'not-found'

/** How the published site answers requests. */
export interface DeployRouting {
  /**
   * The sub-path the app was BUILT for (`/blog`), with a leading slash and no
   * trailing one, or `null` for the site root. A build made with a base emits
   * every URL under it and writes its files relative to the output directory,
   * so the target serves the files AT the base: `/blog/` is `/index.html`,
   * `/blog/assets/x.js` is `/assets/x.js`, and the bare origin redirects to
   * `/blog/`. A path outside the base is not the site's.
   */
  basePath: string | null
  /** What an unmatched path gets. */
  unmatchedPaths: DeployUnmatchedPaths
}

/** A step of a deploy, reported through {@link DeployTargetRequest.onPhase}. */
export type DeployTargetPhase = 'building' | 'publishing'

/** One deploy, as handed to a target. */
export interface DeployTargetRequest {
  /**
   * The stable identity of the site across deploys — one per app (a project
   * id). Every release of the site lives under it, and
   * {@link DeployTargetProvider.remove} removes everything under it.
   * Must match `[A-Za-z0-9_-]{1,128}`.
   */
  siteId: string
  /**
   * This deploy's identity, unique within the site (a timestamp tag, a
   * deployment id). A release is immutable once published: a new deploy is a
   * new release, never an overwrite, so the previous one keeps serving until
   * the caller switches over. Must match `[A-Za-z0-9_-]{1,128}`.
   */
  releaseId: string
  /**
   * The build output. Required by `static-files` targets, which publish
   * exactly these files. An `app-server` target implemented beside the build
   * (it can reach the build environment directly) may ignore it and move the
   * app its own way; one that cannot must refuse a request without it.
   */
  files?: readonly DeployTargetFile[]
  /** How the published site answers requests. */
  routing: DeployRouting
  /**
   * Runtime environment for targets that run a server. Static targets have no
   * runtime and ignore it — a value a static bundle needs has to be present at
   * BUILD time, because that is when the bundler inlines it.
   */
  env?: Readonly<Record<string, string>>
  /** Progress lines for the person watching the deploy. Never throws into the target. */
  log?: (line: string) => void | Promise<void>
  /**
   * Phase transitions, for a caller that mirrors them onto its own record:
   * `building` (a target that builds the app itself is about to) and
   * `publishing` (the release is being written or launched).
   */
  onPhase?: (phase: DeployTargetPhase) => void | Promise<void>
  /**
   * Cooperative cancellation, consulted between steps. When it answers true
   * the target stops, removes what it created for THIS release (never an
   * earlier one), and rejects with an error whose `code` is `'cancelled'`.
   */
  isCancelled?: () => boolean | Promise<boolean>
}

/**
 * Where a published release is served FROM — what an edge in front of the
 * target needs to route a visitor's request to it.
 *
 * - `http-upstream` — a server answering HTTP at `url` for every path; the
 *   edge forwards requests there unchanged.
 * - `static-files` — immutable files under `filesBaseUrl` (a public URL
 *   prefix; the file `/index.html` is `${filesBaseUrl}index.html`) described by
 *   the {@link StaticSiteManifest} at `manifestUrl`. Object stores do not do
 *   directory indexes, base paths or fallbacks, so the edge answers those from
 *   the manifest and fetches only files it names.
 */
export type DeployOrigin =
  | {
      /** A server answering every path. */
      kind: 'http-upstream'
      /** Its routable URL, scheme included. */
      url: string
    }
  | {
      /** Immutable files described by a manifest. */
      kind: 'static-files'
      /** Public URL prefix the files live under, ending with `/`. */
      filesBaseUrl: string
      /** Public URL of the release's {@link StaticSiteManifest}. */
      manifestUrl: string
    }

/** A published release, as a target reports it. */
export interface DeployTargetRelease {
  /** The provider's `name`. */
  target: string
  /** The site this release belongs to. */
  siteId: string
  /** This release's identity. */
  releaseId: string
  /** Where it is served from. */
  origin: DeployOrigin
  /**
   * The public URL, when the TARGET mints one (a third-party host's
   * `*.example.app` address). `null` when the caller owns the public address
   * and routes it to {@link origin} itself.
   */
  url: string | null
  /** The routing the release was published with. */
  routing: DeployRouting
  /** Number of files published (0 for a target that does not publish files). */
  fileCount: number
  /** Total bytes published. */
  bytes: number
}

/** One file entry of a {@link StaticSiteManifest}. */
export interface StaticSiteManifestEntry {
  /** The `Content-Type` to serve the file with. */
  contentType: string
  /** Size in bytes. */
  size: number
  /** A strong validator for the bytes (a hex digest), usable as an `ETag`. */
  etag: string
}

/**
 * The description of one immutable static release — written by a
 * `static-files` target next to the files, read by whatever serves them.
 *
 * It is the whole routing contract: the file set (so a path can be answered
 * with no probe of the store — a directory index, a fallback and a 404 are all
 * decided from here) and the routing the release was built for. A reader must
 * treat an unknown `format` as unreadable rather than guess.
 */
export interface StaticSiteManifest {
  /** Format marker; bumped on any incompatible change. */
  format: 'molecule-static-site/1'
  /** The site this release belongs to. */
  siteId: string
  /** This release's identity. */
  releaseId: string
  /** ISO-8601 time the release was published. */
  publishedAt: string
  /** How the release answers requests. */
  routing: DeployRouting
  /** Every published file, keyed by site-relative path (`/index.html`). */
  files: Record<string, StaticSiteManifestEntry>
}

/** Options for {@link DeployTargetProvider.remove}. */
export interface DeployTargetRemoveOptions {
  /**
   * Releases to KEEP. Absent or empty removes the whole site. Used after a
   * switch-over to reclaim the releases nothing serves any more.
   */
  keepReleaseIds?: readonly string[]
}

/**
 * A place built apps are published to.
 *
 * Bonded by NAME under the `deploy-target` category (`'static'`, `'machine'`,
 * `'netlify'`, …) so an application can wire several and pick one per app.
 */
export interface DeployTargetProvider {
  /** Stable provider name, recorded on every release it publishes. */
  readonly name: string
  /** What kind of app it can host. */
  readonly hosts: DeployTargetHosts
  /**
   * Publish one release. Resolves once the release is COMPLETE at its origin
   * (every file and the manifest written, or the server answering), and not
   * before — a caller switches traffic to it on the strength of this promise.
   * Publishing never touches another release of the same site.
   *
   * @param request - The deploy.
   * @returns The published release.
   * @throws {Error} When the release could not be published completely; what
   *   this call created is removed first. A cancelled deploy rejects with an
   *   error whose `code` is `'cancelled'`.
   */
  deploy(request: DeployTargetRequest): Promise<DeployTargetRelease>
  /**
   * Remove a site's releases — all of them, or all but `keepReleaseIds`.
   * Idempotent: removing a site that has nothing published resolves.
   *
   * @param siteId - The site.
   * @param options - Releases to keep.
   * @throws {Error} When the target could not remove them (a failed listing is
   *   an error, never "nothing to remove").
   */
  remove(siteId: string, options?: DeployTargetRemoveOptions): Promise<void>
}
