/**
 * Keeps `TranslateParams.protect` substrings out of Amazon Translate's reach.
 *
 * Amazon Translate has no tag-handling mode (TranslateText takes plain text),
 * so unlike the Google bond this cannot ride `translate="no"` spans. Instead
 * each protected occurrence goes out as a NUMBERED placeholder token,
 * `{{0}}`-style with a numeric offset, and comes back as the original text,
 * restored by index. The shape was chosen against the live API: numeric-only
 * tokens carry no letters a translator could case-change, and German (the
 * most reordering-heavy of the common targets) passed them through verbatim
 * in testing (2026-11-13).
 *
 * @module
 */

/** What a masked token looks like: `{{N}}`, digits only. */
const TOKEN_PATTERN = /\{\{\s*(\d+)\s*\}\}/g

/** Regex metacharacters, escaped so a token can carry them literally. */
const REGEX_SPECIALS = /[.*+?^${}()|[\]\\]/g

/**
 * A text prepared for Amazon Translate, plus what is needed to restore it.
 */
export interface MaskedText {
  /** The plain text sent to Amazon Translate. */
  masked: string
  /** The protected substrings, in order of occurrence. */
  originals: string[]
  /** The numeric offset the tokens start at (collision avoidance — see {@link maskText}). */
  offset: number
}

/**
 * Masks one text for a plain-text request.
 *
 * Token numbering starts ABOVE the highest `{{N}}` number already present in
 * the caller's text, so a text that itself carries placeholder-shaped content
 * (`{{count}}` is protected, but a stray literal `{{0}}` is not) can never
 * collide with the mask: restore only rewrites tokens in the masked range.
 *
 * @param text - The caller's text.
 * @param protect - Literal substrings to protect.
 * @returns The masked text, its protected substrings, and the token offset.
 */
export function maskText(text: string, protect: string[]): MaskedText {
  const tokens = [...new Set(protect.filter((token) => token.length > 0))]
    .sort((a, b) => b.length - a.length)
    .map((token) => token.replace(REGEX_SPECIALS, '\\$&'))
  const existing = [...text.matchAll(TOKEN_PATTERN)].map((match) => Number(match[1]))
  const offset = existing.length > 0 ? Math.max(...existing) + 1 : 0
  const originals: string[] = []
  const masked =
    tokens.length > 0
      ? text.replace(new RegExp(tokens.join('|'), 'g'), (match) => {
          originals.push(match)
          return `{{${offset + originals.length - 1}}}`
        })
      : text
  return { masked, originals, offset }
}

/**
 * Restores an Amazon Translate result: protected substrings back by index,
 * keeping any whitespace the translator moved around the token.
 *
 * Tokens outside this mask's range (a collision-avoided offset guarantees
 * there are none) pass through untouched.
 *
 * @param translated - Amazon Translate's output.
 * @param originals - The substrings `maskText` protected.
 * @param offset - The token offset `maskText` used.
 * @returns The restored text.
 */
export function unmaskText(translated: string, originals: string[], offset: number): string {
  return translated.replace(TOKEN_PATTERN, (match, number: string) => {
    const index = Number(number) - offset
    const original = index >= 0 && index < originals.length ? originals[index] : undefined
    return original === undefined ? match : original
  })
}
