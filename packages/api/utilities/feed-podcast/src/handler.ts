/**
 * Framework-agnostic HTTP handler factory for serving a podcast RSS
 * feed at `GET /podcasts/:id/feed.xml`.
 *
 * The handler is intentionally decoupled from any specific server
 * library — it accepts a normalized {@link PodcastFeedRequest} and
 * returns a {@link PodcastFeedResponse}. Adapters in
 * `@molecule/api-middleware-*` packages wrap this for Express, Fastify,
 * etc. Callers that already have a route layer can call
 * {@link createPodcastFeedHandler} directly inside their own handler.
 */

import { serializePodcastRss } from './serialize.js'
import type { Podcast, SerializePodcastRssOptions } from './types.js'

/**
 * Minimal request shape consumed by the handler. Only the fields the
 * handler actually reads are included so adapters can synthesize them
 * without dragging in framework types.
 */
export interface PodcastFeedRequest {
  /** Path parameter `id` from `GET /podcasts/:id/feed.xml`. */
  params: { id: string }
}

/**
 * Normalized response returned by the handler. Adapters translate this
 * into framework-specific calls (e.g. `res.status(...).type(...).send(...)`).
 */
export interface PodcastFeedResponse {
  /** HTTP status code. `200` on success, `404` when the lookup fails. */
  status: number

  /** Response headers — always includes `Content-Type` for success. */
  headers: Record<string, string>

  /** Response body. Always a string (XML on success, plain text on 404). */
  body: string
}

/**
 * Loader signature — given a podcast id, return the {@link Podcast} or
 * `null` when not found. The handler treats `null` (or a thrown
 * `NotFoundError`-equivalent) as a 404.
 */
export type PodcastLoader = (id: string) => Promise<Podcast | null> | Podcast | null

/**
 * Options for {@link createPodcastFeedHandler}.
 */
export interface CreatePodcastFeedHandlerOptions {
  /** Resolves a {@link Podcast} by id. Required. */
  load: PodcastLoader

  /** Forwarded to {@link serializePodcastRss}. Optional. */
  serializerOptions?: SerializePodcastRssOptions
}

/**
 * Create a framework-agnostic HTTP handler that responds to
 * `GET /podcasts/:id/feed.xml` with serialized RSS XML.
 *
 * Behavior:
 * - On loader return-value `null` → `404` with `text/plain` body.
 * - On loader return-value {@link Podcast} → `200` with
 *   `application/rss+xml; charset=utf-8` body produced by
 *   {@link serializePodcastRss}.
 *
 * Loader errors propagate — callers wrap in their own error middleware.
 *
 * @param options - Loader + optional serializer options.
 * @returns An async function `(req) => Promise<PodcastFeedResponse>`.
 *
 * @example
 * ```ts
 * import { createPodcastFeedHandler } from '@molecule/api-feed-podcast'
 *
 * const handler = createPodcastFeedHandler({
 *   load: async (id) => podcastResource.loadById(id),
 * })
 *
 * // Express adapter:
 * app.get('/podcasts/:id/feed.xml', async (req, res) => {
 *   const result = await handler({ params: { id: req.params.id } })
 *   res.status(result.status)
 *   for (const [key, value] of Object.entries(result.headers)) res.setHeader(key, value)
 *   res.send(result.body)
 * })
 * ```
 */
export function createPodcastFeedHandler(
  options: CreatePodcastFeedHandlerOptions,
): (req: PodcastFeedRequest) => Promise<PodcastFeedResponse> {
  return async (req: PodcastFeedRequest): Promise<PodcastFeedResponse> => {
    const id = req.params.id
    const podcast = await options.load(id)
    if (podcast == null) {
      return {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        body: 'Podcast not found',
      }
    }
    const xml = serializePodcastRss(podcast, options.serializerOptions)
    return {
      status: 200,
      headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
      body: xml,
    }
  }
}
