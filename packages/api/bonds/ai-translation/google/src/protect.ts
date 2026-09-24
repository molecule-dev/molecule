/**
 * Keeps `TranslateParams.protect` substrings out of Google's reach.
 *
 * Google ignores unknown tags (it translated the names inside a custom `<x>`
 * wrapper — `{{rating}}` → `{{ocjena}}`) and splits braces even inside a
 * `translate="no"` span (`{{count}}` came back as `{{count` or with a stray `}`).
 * So Google never sees a protected substring at all: each occurrence goes out as
 * its INDEX inside `<span translate="no">`, and comes back as the original text,
 * restored by index. Requests use `format=html`, so plain text is escaped on the
 * way in and entities are decoded on the way out.
 *
 * @module
 */

/** Named entities Google's HTML mode returns. */
const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
}

/**
 * Escapes the HTML-significant characters of plain text.
 *
 * @param text - Plain text.
 * @returns The text with `&`, `<`, `>` escaped.
 */
export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Decodes named and numeric character entities back to plain text.
 *
 * @param text - Text returned by an HTML-mode translation.
 * @returns Plain text.
 */
export function decodeEntities(text: string): string {
  return text.replace(
    /&(#\d+|#x[0-9a-f]+|amp|lt|gt|quot|apos|nbsp);/gi,
    (match, entity: string) => {
      if (entity[0] !== '#') return NAMED_ENTITIES[entity.toLowerCase()] ?? match
      const hex = entity[1] === 'x' || entity[1] === 'X'
      return String.fromCodePoint(parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10))
    },
  )
}

/**
 * A text prepared for Google, plus what is needed to restore it.
 */
export interface MaskedText {
  /** The HTML sent to Google. */
  masked: string
  /** The protected substrings, in order of occurrence. */
  originals: string[]
}

/**
 * Masks one text for an HTML-mode request.
 *
 * @param text - The caller's text.
 * @param protect - Literal substrings to protect.
 * @param callerMarkup - True when the caller set `tagHandling` (the text is markup already).
 * @returns The masked text and its protected substrings.
 */
export function maskText(text: string, protect: string[], callerMarkup: boolean): MaskedText {
  const tokens = [...new Set(protect.filter((token) => token.length > 0))]
    .map((token) => (callerMarkup ? token : escapeHtml(token)))
    .sort((a, b) => b.length - a.length)
    .map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const source = callerMarkup ? text : escapeHtml(text)
  const originals: string[] = []
  const masked =
    tokens.length > 0
      ? source.replace(new RegExp(tokens.join('|'), 'g'), (match) => {
          originals.push(callerMarkup ? match : decodeEntities(match))
          return `<span translate="no">${originals.length - 1}</span>`
        })
      : source
  return { masked, originals }
}

/**
 * Restores a Google result: entities decoded (plain text only), then protected
 * substrings back by index, keeping any whitespace Google moved inside the span.
 *
 * @param translated - Google's output.
 * @param originals - The substrings `maskText` protected.
 * @param callerMarkup - True when the caller set `tagHandling`.
 * @returns The restored text.
 */
export function unmaskText(translated: string, originals: string[], callerMarkup: boolean): string {
  const decoded = callerMarkup ? translated : decodeEntities(translated)
  return decoded.replace(
    /<span translate="no">(\s*)(\d+)(\s*)<\/span>/g,
    (match, before: string, index: string, after: string) => {
      const original = originals[Number(index)]
      return original === undefined ? match : `${before}${original}${after}`
    },
  )
}
