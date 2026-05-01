/**
 * Framework-agnostic HTTP handler factory for serving feed output at
 * `GET /<mountPath>.{rss|atom|json}` (or any path scheme the caller wires
 * via the `extensions` map).
 *
 * Returns a request handler whose signature is intentionally minimal so
 * the same builder works with Express (`(req, res, next)` adapter), Hono,
 * Fastify, raw Node `http`, or a worker `fetch` handler.
 *
 * @module
 */

import { FEED_CONTENT_TYPES, serializeFeed } from './serializeFeed.js'
import type { Feed, FeedOutputFormat } from './types.js'

/**
 * Cached payload keyed by output format.
 */
interface CacheEntry {
  body: string
  contentType: string
  /** Epoch ms when the entry was generated. */
  generatedAt: number
  /** Hash-style ETag — incidental change detector, not security-relevant. */
  etag: string
}

/**
 * Configuration for {@link createFeedHandler}.
 */
export interface CreateFeedHandlerOptions {
  /**
   * Async loader returning the feed snapshot. Called whenever the cache is
   * cold or expired. Must throw on data-source failure — the handler then
   * returns `503 Service Unavailable`.
   */
  loadFeed: () => Promise<Feed> | Feed

  /**
   * Cache TTL in milliseconds. Defaults to `60_000` (1 minute). Set to
   * `0` to disable caching (every request re-loads).
   */
  cacheTtlMs?: number

  /**
   * Map of URL-suffix → {@link FeedOutputFormat}.
   *
   * Defaults to `{ rss: 'rss-2.0', atom: 'atom-1.0', json: 'json-feed' }`.
   *
   * The handler reads the request path's extension via {@link FeedRequest.extension}
   * (callers compute this from the URL — see the function-level docs).
   */
  extensions?: Record<string, FeedOutputFormat>

  /**
   * Optional logger called on errors. Defaults to a no-op.
   */
  onError?: (err: unknown) => void
}

/**
 * Minimal request shape consumed by the generated handler.
 */
export interface FeedRequest {
  /**
   * URL extension portion — `'rss'`, `'atom'`, `'json'`, or any custom key
   * the caller wired in {@link CreateFeedHandlerOptions.extensions}.
   *
   * Callers compute this from the request URL (e.g.
   * `req.path.split('.').pop()` for Express).
   */
  extension: string

  /** Optional `If-None-Match` ETag value, for 304 short-circuiting. */
  ifNoneMatch?: string
}

/**
 * Minimal response shape returned by the handler. Framework adapters map
 * this onto their native response API (`res.status().set().send()` for
 * Express, `new Response(body, { status, headers })` for fetch, etc.).
 */
export interface FeedResponse {
  /** HTTP status code: `200` / `304` / `404` / `503`. */
  status: number

  /** Headers — always includes `Content-Type` on `200`. */
  headers: Record<string, string>

  /** Body — empty string on `304` / `404` / errors. */
  body: string
}

const DEFAULT_EXTENSIONS: Record<string, FeedOutputFormat> = {
  rss: 'rss-2.0',
  atom: 'atom-1.0',
  json: 'json-feed',
}

/**
 * djb2-style hash, base36-encoded — used for ETag generation. Not
 * cryptographic; collisions are tolerable for HTTP caching.
 *
 * @param s - Input string.
 * @returns Compact base36 hash.
 */
function hash(s: string): string {
  let h = 5381
  for (let i = 0; i < s.length; i++) {
    h = (h * 33) ^ s.charCodeAt(i)
  }
  return (h >>> 0).toString(36)
}

/**
 * Create a framework-agnostic feed HTTP handler with built-in TTL caching.
 *
 * The returned handler accepts a {@link FeedRequest} and returns a
 * {@link FeedResponse}. It serves three formats by default — RSS 2.0,
 * Atom 1.0, JSON Feed — keyed by URL extension.
 *
 * **Caching** — feed payloads are cached per-format for `cacheTtlMs`
 * (default 1 minute). Each cache entry carries an ETag computed from the
 * payload hash; matching `If-None-Match` triggers a `304` response.
 *
 * **Error handling** — if `loadFeed` throws, the handler returns `503`
 * with body `''`. The error is forwarded to `onError` if provided.
 *
 * **No XSS surface** — all interpolation runs through the underlying
 * serializers (`serializeRss2` / `serializeAtom1` / `serializeJsonFeed`),
 * which escape every user-supplied field. The handler itself never
 * concatenates request data into the response body.
 *
 * @example Express adapter
 * ```ts
 * import express from 'express'
 * import { createFeedHandler } from '@molecule/api-feed-rss'
 *
 * const handle = createFeedHandler({
 *   loadFeed: async () => ({
 *     title: 'Blog',
 *     link: 'https://example.com',
 *     description: '...',
 *     items: await db.posts.findMany(...),
 *   }),
 * })
 *
 * const app = express()
 * app.get('/feed.:ext', async (req, res) => {
 *   const result = await handle({
 *     extension: req.params.ext,
 *     ifNoneMatch: req.get('If-None-Match'),
 *   })
 *   res.status(result.status).set(result.headers).send(result.body)
 * })
 * ```
 *
 * @param options - See {@link CreateFeedHandlerOptions}.
 * @returns Async handler function `(req: FeedRequest) => Promise<FeedResponse>`.
 */
export function createFeedHandler(
  options: CreateFeedHandlerOptions,
): (req: FeedRequest) => Promise<FeedResponse> {
  const ttl = options.cacheTtlMs ?? 60_000
  const extMap = { ...DEFAULT_EXTENSIONS, ...(options.extensions ?? {}) }
  const onError = options.onError ?? (() => {})
  const cache = new Map<FeedOutputFormat, CacheEntry>()

  return async function handle(req: FeedRequest): Promise<FeedResponse> {
    const ext = (req.extension ?? '').toLowerCase()
    const format = extMap[ext]
    if (!format) {
      return { status: 404, headers: {}, body: '' }
    }

    const now = Date.now()
    let entry = cache.get(format)
    if (!entry || (ttl > 0 && now - entry.generatedAt > ttl) || ttl === 0) {
      try {
        const feed = await options.loadFeed()
        const body = serializeFeed(feed, format)
        entry = {
          body,
          contentType: FEED_CONTENT_TYPES[format],
          generatedAt: now,
          etag: `"${hash(body)}"`,
        }
        if (ttl > 0) cache.set(format, entry)
        else cache.delete(format)
      } catch (err) {
        onError(err)
        return { status: 503, headers: {}, body: '' }
      }
    }

    if (req.ifNoneMatch && req.ifNoneMatch === entry.etag) {
      return {
        status: 304,
        headers: { ETag: entry.etag },
        body: '',
      }
    }

    return {
      status: 200,
      headers: {
        'Content-Type': entry.contentType,
        ETag: entry.etag,
        'Cache-Control': ttl > 0 ? `public, max-age=${Math.floor(ttl / 1000)}` : 'no-store',
      },
      body: entry.body,
    }
  }
}
