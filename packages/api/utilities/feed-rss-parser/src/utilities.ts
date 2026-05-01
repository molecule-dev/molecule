import { createHash } from 'node:crypto'

/**
 * Normalize a value that may be a single item or an array into a definite array.
 * `undefined` and `null` collapse to `[]` so callers can iterate unconditionally.
 *
 * @param value - The (possibly array, possibly nullish, possibly scalar) value.
 * @returns A non-null array. Never returns `undefined`.
 */
export function toArray<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) return []
  return Array.isArray(value) ? value : [value]
}

/**
 * Coerce a (possibly array-valued) fast-xml-parser node to its first usable
 * text value. Mirrors {@link textOf} but transparently unwraps arrays — which
 * the parser produces for any element listed in `isArray`.
 *
 * @param value - The fast-xml-parser node — string, primitive, object, array, or nullish.
 * @returns Trimmed first text value, or `undefined` when no usable value exists.
 */
export function firstText(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    for (const candidate of value) {
      const text = textOf(candidate)
      if (text) return text
    }
    return undefined
  }
  return textOf(value)
}

/**
 * Coerce a fast-xml-parser node to a string.
 *
 * fast-xml-parser may emit a leaf as either:
 * - a primitive (`string` / `number` / `boolean`)
 * - an object with `#text` (when the element has attributes alongside content)
 * - an object with attribute keys (when `textNodeName` differs)
 *
 * This helper handles all three. Returns `undefined` when no usable value exists.
 *
 * @param value - The fast-xml-parser leaf value.
 * @returns Trimmed string or `undefined`.
 */
export function textOf(value: unknown): string | undefined {
  if (value == null) return undefined
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed === '' ? undefined : trimmed
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if ('#text' in obj) {
      const text = obj['#text']
      if (typeof text === 'string') {
        const trimmed = text.trim()
        return trimmed === '' ? undefined : trimmed
      }
      if (typeof text === 'number' || typeof text === 'boolean') {
        return String(text)
      }
    }
  }
  return undefined
}

/**
 * Extract an attribute value (e.g. `href`, `url`) from a fast-xml-parser node.
 *
 * Attributes are exposed under the `attributeNamePrefix` ('@_' by default).
 * This helper is tolerant of missing attribute objects.
 *
 * @param value - The fast-xml-parser node (object, primitive, or undefined).
 * @param name - Attribute name without the prefix (e.g. `'href'`).
 * @returns Attribute value as a trimmed string, or `undefined`.
 */
export function attrOf(value: unknown, name: string): string | undefined {
  if (value == null || typeof value !== 'object') return undefined
  const obj = value as Record<string, unknown>
  const raw = obj[`@_${name}`]
  if (raw == null) return undefined
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    return trimmed === '' ? undefined : trimmed
  }
  if (typeof raw === 'number' || typeof raw === 'boolean') {
    return String(raw)
  }
  return undefined
}

/**
 * Parse a date-ish string into an ISO 8601 timestamp.
 *
 * Accepts RFC 822 (RSS `pubDate`), RFC 3339 (Atom / JSON Feed), and most
 * common variants the JavaScript `Date` constructor handles natively.
 *
 * @param value - Possibly a date string, or `undefined`.
 * @returns ISO 8601 string when parseable, else `undefined`.
 */
export function toIsoDate(value: string | undefined): string | undefined {
  if (!value) return undefined
  const ts = Date.parse(value)
  if (Number.isNaN(ts)) return undefined
  return new Date(ts).toISOString()
}

/**
 * Parse iTunes podcast `<itunes:duration>` formats into seconds.
 *
 * Accepted shapes:
 * - bare integer seconds: `"3600"`
 * - `MM:SS`: `"42:30"`
 * - `HH:MM:SS`: `"01:42:30"`
 *
 * @param value - The duration string, or `undefined`.
 * @returns Duration in seconds, or `undefined` when unparseable.
 */
export function parseItunesDuration(value: string | undefined): number | undefined {
  if (!value) return undefined
  const trimmed = value.trim()
  if (trimmed === '') return undefined
  if (/^\d+$/.test(trimmed)) return Number(trimmed)
  const parts = trimmed.split(':').map((p) => p.trim())
  if (parts.length === 2 || parts.length === 3) {
    const nums = parts.map((p) => Number(p))
    if (nums.some((n) => Number.isNaN(n))) return undefined
    if (parts.length === 3) {
      return nums[0]! * 3600 + nums[1]! * 60 + nums[2]!
    }
    return nums[0]! * 60 + nums[1]!
  }
  return undefined
}

/**
 * Compute a stable identifier when a feed item has neither a GUID nor a link.
 *
 * Uses SHA-1 over `title + '' + publishedAt` to give a deterministic,
 * compact key. Collisions are tolerable here — this is a deduplication aid,
 * not a security primitive.
 *
 * @param title - Item title (may be empty).
 * @param publishedAt - Pre-parsed ISO 8601 publication date, if any.
 * @returns Hex-encoded SHA-1 digest. Always 40 characters.
 */
export function synthesizeItemId(title: string, publishedAt: string | undefined): string {
  const hash = createHash('sha1')
  hash.update(title)
  hash.update('')
  hash.update(publishedAt ?? '')
  return hash.digest('hex')
}
