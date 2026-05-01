/**
 * Format-discriminated dispatcher used by the HTTP handler factory.
 *
 * @module
 */

import { serializeAtom1 } from './serializeAtom1.js'
import { serializeJsonFeed } from './serializeJsonFeed.js'
import { serializeRss2 } from './serializeRss2.js'
import type { Feed, FeedOutputFormat } from './types.js'

/**
 * The MIME type each format is served with.
 */
export const FEED_CONTENT_TYPES: Record<FeedOutputFormat, string> = {
  'rss-2.0': 'application/rss+xml; charset=utf-8',
  'atom-1.0': 'application/atom+xml; charset=utf-8',
  'json-feed': 'application/feed+json; charset=utf-8',
}

/**
 * Serialize a {@link Feed} to the body string for a given output format.
 *
 * Delegates to {@link serializeRss2} / {@link serializeAtom1} /
 * {@link serializeJsonFeed}. Useful when callers want a single entry
 * point keyed by a runtime-determined format (e.g. inside a route
 * handler dispatching on the URL extension).
 *
 * @param feed - The feed structure.
 * @param format - Target output format.
 * @returns Serialized body string.
 */
export function serializeFeed(feed: Feed, format: FeedOutputFormat): string {
  if (format === 'rss-2.0') return serializeRss2(feed)
  if (format === 'atom-1.0') return serializeAtom1(feed)
  return serializeJsonFeed(feed)
}
