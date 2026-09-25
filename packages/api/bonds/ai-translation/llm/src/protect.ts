/**
 * Keeps `TranslateParams.protect` substrings away from the model.
 *
 * Each protected occurrence becomes a numbered token `⟦N⟧` — short, never a real
 * word in any language, so the model has nothing to translate — and is restored
 * from the original text by index afterwards. A model that drops or invents a
 * token is detected by `tokensIntact`, and the provider re-asks for that text.
 *
 * @module
 */

/**
 * A text prepared for the model, plus what is needed to restore it.
 */
export interface MaskedText {
  /** The text with each protected substring replaced by `⟦N⟧`. */
  masked: string
  /** The protected substrings, in order of occurrence. */
  originals: string[]
}

/**
 * Replaces each protected substring (longest first) with a numbered token.
 *
 * @param text - The caller's text.
 * @param protect - Literal substrings to protect.
 * @returns The masked text and its protected substrings.
 */
export function maskText(text: string, protect: string[]): MaskedText {
  const tokens = [...new Set(protect.filter((token) => token.length > 0))]
    .sort((a, b) => b.length - a.length)
    .map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const originals: string[] = []
  const masked =
    tokens.length > 0
      ? text.replace(new RegExp(tokens.join('|'), 'g'), (match) => {
          originals.push(match)
          return `⟦${originals.length - 1}⟧`
        })
      : text
  return { masked, originals }
}

/**
 * Whether a translation carries every token of its source exactly once and no
 * others.
 *
 * @param translated - The model's output for one text.
 * @param originals - The substrings `maskText` protected for that text.
 * @returns True when every `⟦N⟧` is present once and none is extra.
 */
export function tokensIntact(translated: string, originals: string[]): boolean {
  const found = [...translated.matchAll(/⟦(\d+)⟧/g)].map((m) => Number(m[1])).sort((a, b) => a - b)
  return found.length === originals.length && found.every((n, i) => n === i)
}

/**
 * Restores protected substrings by index.
 *
 * @param translated - The model's output for one text.
 * @param originals - The substrings `maskText` protected for that text.
 * @returns The restored text.
 */
export function unmaskText(translated: string, originals: string[]): string {
  return translated.replace(/⟦(\d+)⟧/g, (match, index: string) => originals[Number(index)] ?? match)
}
