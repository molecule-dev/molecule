/**
 * Keeps `TranslateParams.protect` substrings out of DeepL's reach.
 *
 * Each protected occurrence is replaced by an indexed `<x>N</x>` tag that DeepL
 * skips (`tag_handling=xml` + `ignore_tags=x`), and restored from the original
 * text afterwards by index — so even whitespace DeepL moves inside the tag, or a
 * reordered sentence, gets the exact original substring back. Because the request
 * is XML, bare `&`/`<`/`>` in plain text are escaped first (unescaped, DeepL
 * rejects the whole batch as "not well-formed") and entities are decoded on the
 * way back out.
 *
 * @module
 */

/** Named entities DeepL's XML mode can return. */
const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
}

/**
 * Escapes the XML-significant characters of plain text.
 *
 * @param text - Plain text.
 * @returns The text with `&`, `<`, `>` escaped.
 */
export function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Decodes named and numeric character entities back to plain text.
 *
 * @param text - Text returned by the XML translation.
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
 * Builds a regular expression matching any protected substring, longest first so
 * an overlapping shorter token never splits a longer one.
 *
 * @param protect - Literal substrings to protect.
 * @param escaped - Whether to match their XML-escaped form.
 * @returns The pattern, or null when there is nothing to protect.
 */
function protectPattern(protect: string[], escaped: boolean): RegExp | null {
  const tokens = [...new Set(protect.filter((token) => token.length > 0))]
    .map((token) => (escaped ? escapeXml(token) : token))
    .sort((a, b) => b.length - a.length)
    .map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  return tokens.length > 0 ? new RegExp(tokens.join('|'), 'g') : null
}

/**
 * A text prepared for DeepL, plus what is needed to restore it.
 */
export interface MaskedText {
  /** The XML sent to DeepL. */
  masked: string
  /** The protected substrings, in order of occurrence. */
  originals: string[]
}

/**
 * Masks one text for an XML-mode request.
 *
 * @param text - The caller's text.
 * @param protect - Literal substrings to protect.
 * @param callerMarkup - True when the caller set `tagHandling` (the text is markup already).
 * @returns The masked text and its protected substrings.
 */
export function maskText(text: string, protect: string[], callerMarkup: boolean): MaskedText {
  const source = callerMarkup ? text : escapeXml(text)
  const pattern = protectPattern(protect, !callerMarkup)
  const originals: string[] = []
  const masked = pattern
    ? source.replace(pattern, (match) => {
        originals.push(callerMarkup ? match : decodeEntities(match))
        return `<x>${originals.length - 1}</x>`
      })
    : source
  return { masked, originals }
}

/**
 * Restores a DeepL result: protected substrings back by index, then (for plain
 * text) entities decoded.
 *
 * @param translated - DeepL's output.
 * @param originals - The substrings `maskText` protected.
 * @param callerMarkup - True when the caller set `tagHandling`.
 * @returns The restored text.
 */
export function unmaskText(translated: string, originals: string[], callerMarkup: boolean): string {
  // Decode first so a restored substring that itself contains `&lt;` is never decoded twice.
  const decoded = callerMarkup ? translated : decodeEntities(translated)
  return decoded.replace(
    /<x>(\s*)(\d+)(\s*)<\/x>/g,
    (match, before: string, index: string, after: string) => {
      const original = originals[Number(index)]
      return original === undefined ? match : `${before}${original}${after}`
    },
  )
}
