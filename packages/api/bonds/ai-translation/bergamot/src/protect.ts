/**
 * Keeps `TranslateParams.protect` substrings away from the Bergamot models.
 *
 * Two encodings, tried in order, both restored from the original text by index:
 *
 * 1. **Plain-text tokens `⟦N⟧`.** Measured on the en→de/es/ja models, these
 *    come back in the right place with the right spacing most of the time — but
 *    a model occasionally drops one ("{0} liked your post" → "Le gustó tu post").
 * 2. **HTML mode with an empty `<x id="N"></x>` element**, for every text that
 *    lost a token in step 1. Bergamot's HTML mode re-inserts every tag using its
 *    word alignments, so nothing is ever dropped — but the spacing around the tag
 *    is unreliable (`hast  <x…>Artikel`), so it is rebuilt from the source text:
 *    no space next to scripts written without spaces (Chinese, Japanese, Thai…),
 *    otherwise the source's spacing where the tag sits between words.
 *
 * @module
 */

/** Named entities Bergamot's HTML mode can return. */
const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00a0',
}

/** Scripts written without spaces between words. */
const NO_SPACE_SCRIPT =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}\u3000-\u303f\uff00-\uffef]/u

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
 * Builds a pattern matching any protected substring, longest first so a shorter
 * token never splits a longer one.
 *
 * @param protect - Literal substrings to protect.
 * @returns The pattern, or null when there is nothing to protect.
 */
function protectPattern(protect: string[]): RegExp | null {
  const tokens = [...new Set(protect.filter((token) => token.length > 0))]
    .sort((a, b) => b.length - a.length)
    .map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  return tokens.length > 0 ? new RegExp(tokens.join('|'), 'g') : null
}

/**
 * One protected occurrence and the spacing around it in the source.
 */
export interface ProtectedSpan {
  /** The protected substring. */
  text: string
  /** Whether the source had whitespace directly before it. */
  spaceBefore: boolean
  /** Whether the source had whitespace directly after it. */
  spaceAfter: boolean
}

/**
 * Finds every protected occurrence in a text, in order.
 *
 * @param text - The caller's text.
 * @param protect - Literal substrings to protect.
 * @returns The occurrences with their surrounding spacing.
 */
export function findProtected(text: string, protect: string[]): ProtectedSpan[] {
  const pattern = protectPattern(protect)
  if (!pattern) return []
  return [...text.matchAll(pattern)].map((match) => {
    const start = match.index
    const end = start + match[0].length
    return {
      text: match[0],
      spaceBefore: start > 0 && /\s/.test(text[start - 1]),
      spaceAfter: end < text.length && /\s/.test(text[end]),
    }
  })
}

/**
 * Masks protected substrings as plain-text `⟦N⟧` tokens.
 *
 * @param text - The caller's text.
 * @param protect - Literal substrings to protect.
 * @returns The masked text.
 */
export function maskTokens(text: string, protect: string[]): string {
  const pattern = protectPattern(protect)
  let index = 0
  return pattern ? text.replace(pattern, () => `⟦${index++}⟧`) : text
}

/**
 * Whether a token-masked translation carries every token exactly once and no others.
 *
 * @param translated - The engine's output.
 * @param count - How many protected substrings the source had.
 * @returns True when `⟦0⟧`…`⟦count-1⟧` each appear once.
 */
export function tokensIntact(translated: string, count: number): boolean {
  const found = [...translated.matchAll(/⟦\s*(\d+)\s*⟧/g)]
    .map((match) => Number(match[1]))
    .sort((a, b) => a - b)
  return found.length === count && found.every((n, i) => n === i)
}

/**
 * Restores `⟦N⟧` tokens by index.
 *
 * @param translated - The engine's output.
 * @param spans - The source's protected substrings.
 * @returns The restored text.
 */
export function unmaskTokens(translated: string, spans: ProtectedSpan[]): string {
  return translated.replace(
    /⟦\s*(\d+)\s*⟧/g,
    (match, index: string) => spans[Number(index)]?.text ?? match,
  )
}

/**
 * Masks protected substrings as empty `<x id="N"></x>` elements for HTML mode.
 *
 * @param text - The caller's text.
 * @param protect - Literal substrings to protect.
 * @param callerMarkup - True when the text is already markup (the caller set `tagHandling`).
 * @returns HTML for the engine.
 */
export function maskHtml(text: string, protect: string[], callerMarkup: boolean): string {
  const pattern = protectPattern(protect)
  if (!pattern) return callerMarkup ? text : escapeHtml(text)
  let out = ''
  let last = 0
  let index = 0
  for (const match of text.matchAll(pattern)) {
    const between = text.slice(last, match.index)
    out += (callerMarkup ? between : escapeHtml(between)) + `<x id="${index++}"></x>`
    last = match.index + match[0].length
  }
  const rest = text.slice(last)
  return out + (callerMarkup ? rest : escapeHtml(rest))
}

/**
 * Restores `<x id="N"></x>` elements by index and rebuilds the spacing around
 * them (see the module description); entities are decoded first for plain text.
 *
 * @param translated - The engine's HTML output.
 * @param spans - The source's protected substrings.
 * @param source - The caller's original text.
 * @param callerMarkup - True when the caller set `tagHandling` (output stays markup).
 * @returns The restored text.
 */
export function unmaskHtml(
  translated: string,
  spans: ProtectedSpan[],
  source: string,
  callerMarkup: boolean,
): string {
  const tag = /([^\S\n]*)<x id="(\d+)"><\/x>([^\S\n]*)/g
  // Decode first so a restored substring that itself contains an entity is never decoded.
  const decoded = callerMarkup ? translated : decodeEntities(translated)
  let restored = decoded.replace(
    tag,
    (match, before: string, index: string, after: string, offset: number, whole: string) => {
      const span = spans[Number(index)]
      if (!span) return match
      const prev = whole.slice(0, offset).slice(-1)
      const next = whole.slice(offset + match.length).slice(0, 1)
      const spaceBefore =
        prev !== '' && !NO_SPACE_SCRIPT.test(prev) && (before !== '' || span.spaceBefore)
      const spaceAfter =
        next !== '' &&
        !NO_SPACE_SCRIPT.test(next) &&
        (after !== '' || (span.spaceAfter && /[\p{L}\p{N}]/u.test(next)))
      return `${spaceBefore ? ' ' : ''}${span.text}${spaceAfter ? ' ' : ''}`
    },
  )
  if (!/^\s/.test(source)) restored = restored.replace(/^\s+/, '')
  if (!/\s$/.test(source)) restored = restored.replace(/\s+$/, '')
  return restored
}
