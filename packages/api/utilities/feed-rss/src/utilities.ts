/**
 * Internal helpers shared by every serializer.
 *
 * @module
 */

import type { Feed, FeedOutputFormat } from './types.js'
import { FeedSerializeError } from './types.js'

/**
 * Coerce a `Date` / ISO string / arbitrary string into an ISO 8601 string.
 *
 * Returns `undefined` if the input is missing or unparseable. Unparseable
 * arbitrary strings fall back to `undefined` rather than throwing — the
 * serializer simply omits the timestamp element rather than emitting
 * `Invalid Date`.
 *
 * @param value - Raw `Date`, ISO string, or other date-like string.
 * @returns ISO 8601 timestamp (`2026-04-28T15:00:00.000Z`) or `undefined`.
 */
export function toIso(value: string | Date | undefined | null): string | undefined {
  if (value === undefined || value === null) return undefined
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.toISOString() : undefined
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const ms = Date.parse(value)
    if (Number.isFinite(ms)) return new Date(ms).toISOString()
  }
  return undefined
}

/**
 * Coerce a `Date` / ISO string into an RFC 822 date string suitable for
 * RSS 2.0 `<pubDate>` / `<lastBuildDate>` fields.
 *
 * Always returns GMT / `+0000`. Returns `undefined` for unparseable input.
 *
 * @param value - Raw `Date`, ISO string, or RFC 822 string.
 * @returns RFC 822 timestamp (`Mon, 28 Apr 2026 15:00:00 GMT`) or `undefined`.
 */
export function toRfc822(value: string | Date | undefined | null): string | undefined {
  if (value === undefined || value === null) return undefined
  let date: Date | undefined
  if (value instanceof Date) {
    if (Number.isFinite(value.getTime())) date = value
  } else if (typeof value === 'string' && value.trim() !== '') {
    const ms = Date.parse(value)
    if (Number.isFinite(ms)) date = new Date(ms)
  }
  if (!date) return undefined

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]
  const pad = (n: number): string => (n < 10 ? `0${n}` : `${n}`)
  return (
    `${days[date.getUTCDay()]}, ${pad(date.getUTCDate())} ${months[date.getUTCMonth()]} ` +
    `${date.getUTCFullYear()} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:` +
    `${pad(date.getUTCSeconds())} GMT`
  )
}

/**
 * Format a duration in seconds as `HH:MM:SS`, used for `<itunes:duration>`.
 *
 * Returns `undefined` for non-finite or negative input.
 *
 * @param seconds - Whole or fractional seconds.
 * @returns `HH:MM:SS` string or `undefined`.
 */
export function toHhMmSs(seconds: number | undefined | null): string | undefined {
  if (seconds === undefined || seconds === null) return undefined
  if (!Number.isFinite(seconds) || seconds < 0) return undefined
  const total = Math.floor(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number): string => (n < 10 ? `0${n}` : `${n}`)
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

/**
 * Validate {@link Feed} input has the minimum required fields for the
 * given output format.
 *
 * @param feed - Feed input.
 * @param format - Target serialization format.
 * @throws {@link FeedSerializeError} if a required field is missing.
 */
export function assertFeedShape(feed: Feed, format: FeedOutputFormat): void {
  if (!feed || typeof feed !== 'object') {
    throw new FeedSerializeError('feed must be an object', format)
  }
  if (typeof feed.title !== 'string' || feed.title === '') {
    throw new FeedSerializeError('feed.title is required', format)
  }
  if (typeof feed.link !== 'string' || feed.link === '') {
    throw new FeedSerializeError('feed.link is required', format)
  }
  if (format === 'rss-2.0' && (typeof feed.description !== 'string' || feed.description === '')) {
    throw new FeedSerializeError('feed.description is required for RSS 2.0', format)
  }
  if (!Array.isArray(feed.items)) {
    throw new FeedSerializeError('feed.items must be an array', format)
  }
  for (const [i, item] of feed.items.entries()) {
    if (!item || typeof item !== 'object') {
      throw new FeedSerializeError(`feed.items[${i}] must be an object`, format)
    }
    if (typeof item.id !== 'string' || item.id === '') {
      throw new FeedSerializeError(`feed.items[${i}].id is required`, format)
    }
    if (typeof item.title !== 'string') {
      throw new FeedSerializeError(`feed.items[${i}].title must be a string`, format)
    }
  }
}

/**
 * Indent each newline of `body` by `pad` spaces. Used for pretty-printing.
 *
 * @param body - Multi-line text. Empty input returns empty string.
 * @param pad - Number of spaces to prepend to each line.
 * @returns Indented text.
 */
export function indent(body: string, pad: number): string {
  if (body === '') return ''
  const prefix = ' '.repeat(pad)
  return body
    .split('\n')
    .map((line) => (line === '' ? line : prefix + line))
    .join('\n')
}

/**
 * Whether a string looks like an HTTP(S) URL — used to set
 * `<guid isPermaLink>` and to fall back to `link` for `<id>` synthesis.
 *
 * @param value - Candidate string.
 * @returns `true` if the value parses as `http:` or `https:` URL.
 */
export function looksLikeHttpUrl(value: string | undefined | null): boolean {
  if (typeof value !== 'string' || value === '') return false
  return /^https?:\/\//i.test(value.trim())
}
