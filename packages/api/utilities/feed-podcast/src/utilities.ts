/**
 * Pure helpers used by the podcast RSS serializer.
 *
 * These are intentionally minimal — no DOM, no XML library, no third-party
 * sanitizer. The serializer must produce valid XML even for hostile input
 * (titles containing `<script>`, descriptions with `]]>` sequences, URLs
 * with `&` query strings), so all helpers here treat their input as
 * untrusted text.
 */

const XML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
}

/**
 * XML-escape a string for safe inclusion in element text or attribute
 * values. Replaces `&`, `<`, `>`, `"`, and `'` with their named entity
 * references. Returns an empty string when input is `undefined` or
 * `null` so callers can chain freely.
 *
 * @param value - Untrusted text to escape.
 * @returns Escaped XML-safe string.
 */
export function escapeXml(value: string | undefined | null): string {
  if (value == null) return ''
  return String(value).replace(/[&<>"']/g, (char) => XML_ESCAPE_MAP[char] ?? char)
}

/**
 * Wrap arbitrary text (including HTML markup) in a CDATA section. The
 * only sequence forbidden inside CDATA is the literal `]]>`, which we
 * neutralize by splitting it across two CDATA blocks. Idempotent:
 * `wrapCdata(wrapCdata(x))` produces the same XML semantics.
 *
 * @param value - Text to wrap.
 * @returns CDATA-wrapped string safe for embedding in XML element bodies.
 */
export function wrapCdata(value: string | undefined | null): string {
  if (value == null) return '<![CDATA[]]>'
  const safe = String(value).replace(/]]>/g, ']]]]><![CDATA[>')
  return `<![CDATA[${safe}]]>`
}

/**
 * Format a duration in seconds into the iTunes-preferred string form.
 * Apple Podcasts accepts both `MM:SS` and `HH:MM:SS`; we emit
 * `HH:MM:SS` when total length is ≥ 1 hour, `MM:SS` otherwise.
 *
 * Negative or non-finite values throw — they indicate a programming
 * bug in the caller's domain mapping rather than malformed feed data.
 *
 * @param seconds - Non-negative finite integer or float; fractional
 *                  seconds are rounded down.
 * @returns Zero-padded duration string.
 * @throws {RangeError} when `seconds` is negative or non-finite.
 */
export function formatItunesDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    throw new RangeError(
      `formatItunesDuration: seconds must be a non-negative finite number, got ${seconds}`,
    )
  }
  const total = Math.floor(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  const pad = (n: number): string => n.toString().padStart(2, '0')
  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`
  }
  return `${pad(minutes)}:${pad(secs)}`
}

/**
 * Format an ISO 8601 timestamp (or a `Date`) as an RFC 822 string
 * suitable for `<pubDate>` and `<lastBuildDate>` in RSS 2.0. Uses GMT
 * for stable, locale-free output.
 *
 * @param input - Date instance or any string parseable by `Date`.
 * @returns RFC 822 date string (e.g. `Mon, 01 May 2026 12:34:56 GMT`).
 * @throws {RangeError} when the input cannot be parsed into a valid date.
 */
export function formatRfc822(input: Date | string): string {
  const date = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(date.getTime())) {
    throw new RangeError(`formatRfc822: invalid date input ${JSON.stringify(input)}`)
  }
  return date.toUTCString()
}
