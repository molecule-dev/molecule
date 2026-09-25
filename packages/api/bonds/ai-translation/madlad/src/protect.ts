/**
 * Keeps `TranslateParams.protect` substrings away from MADLAD-400.
 *
 * MADLAD has no markup mode and drops or rewrites placeholders more often than
 * the dedicated translation APIs (measured on en→ja: a third of short strings
 * lost at least one, whatever form it took, sometimes replaced by an invented
 * date). So each text goes through up to four passes, and only the texts that
 * lost a placeholder move on to the next:
 *
 * 1–3. The placeholder is sent as an indexed marker — `[N]`, then `<xN/>`, then
 *      `⟦N⟧` (different models keep different shapes) — and restored by index.
 * 4.   Last resort: the text is cut at its placeholders, the pieces are
 *      translated on their own, and the result is re-assembled around the
 *      original placeholders in source order. Every placeholder survives; the
 *      word order around them may read like English.
 *
 * @module
 */

/**
 * One way of writing an indexed placeholder.
 */
export interface MarkerForm {
  /** Short name, for diagnostics. */
  name: string
  /** Writes marker N. */
  write: (index: number) => string
  /** Finds markers in a translation; group 1 is the index. */
  find: RegExp
}

/** The marker shapes tried in order. */
export const MARKER_FORMS: MarkerForm[] = [
  { name: 'brackets', write: (i) => `[${i}]`, find: /\[\s*(\d+)\s*\]/g },
  { name: 'xml', write: (i) => `<x${i}/>`, find: /<\s*x\s*(\d+)\s*\/?\s*>/g },
  { name: 'tokens', write: (i) => `⟦${i}⟧`, find: /⟦\s*(\d+)\s*⟧/g },
]

/**
 * Builds a pattern matching any protected substring, longest first.
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
 * Splits a text at its protected substrings.
 *
 * @param text - The caller's text.
 * @param protect - Literal substrings to protect.
 * @returns `pieces` (length n+1) around the n `originals`.
 */
export function splitProtected(
  text: string,
  protect: string[],
): { pieces: string[]; originals: string[] } {
  const pattern = protectPattern(protect)
  const pieces: string[] = []
  const originals: string[] = []
  let last = 0
  if (pattern) {
    for (const match of text.matchAll(pattern)) {
      pieces.push(text.slice(last, match.index))
      originals.push(match[0])
      last = match.index + match[0].length
    }
  }
  pieces.push(text.slice(last))
  return { pieces, originals }
}

/**
 * Masks a split text with one marker form.
 *
 * @param pieces - Text around the placeholders.
 * @param form - Marker shape.
 * @returns The masked text.
 */
export function maskWith(pieces: string[], form: MarkerForm): string {
  return pieces.reduce((out, piece, i) => (i === 0 ? piece : `${out}${form.write(i - 1)}${piece}`))
}

/**
 * Whether a translation carries every marker exactly once and no others.
 *
 * @param translated - The model's output.
 * @param count - How many placeholders the source had.
 * @param form - Marker shape.
 * @returns True when markers 0…count-1 each appear once.
 */
export function markersIntact(translated: string, count: number, form: MarkerForm): boolean {
  const found = [...translated.matchAll(form.find)]
    .map((match) => Number(match[1]))
    .sort((a, b) => a - b)
  return found.length === count && found.every((n, i) => n === i)
}

/**
 * Restores markers by index.
 *
 * @param translated - The model's output.
 * @param originals - The protected substrings.
 * @param form - Marker shape.
 * @returns The restored text.
 */
export function unmaskWith(translated: string, originals: string[], form: MarkerForm): string {
  return translated.replace(form.find, (match, index: string) => originals[Number(index)] ?? match)
}

/**
 * Whether a piece needs translating (has a letter or number, not just spacing/punctuation).
 *
 * @param piece - Text between placeholders.
 * @returns True when the model should see it.
 */
export function isTranslatable(piece: string): boolean {
  return /[\p{L}\p{N}]/u.test(piece)
}

/**
 * Re-assembles a text from separately translated pieces, keeping each piece's
 * original leading/trailing spacing so placeholders stay separated as before.
 *
 * @param pieces - Source pieces.
 * @param translatedPieces - Translation of each piece (untranslatable ones as-is).
 * @param originals - The protected substrings.
 * @returns The assembled text.
 */
export function assemblePieces(
  pieces: string[],
  translatedPieces: string[],
  originals: string[],
): string {
  return pieces
    .map((piece, i) => {
      const translated = translatedPieces[i]
      if (!isTranslatable(piece)) return piece
      const lead = /^\s*/.exec(piece)![0]
      const trail = /\s*$/.exec(piece)![0]
      return `${lead}${translated.trim()}${trail}`
    })
    .reduce((out, piece, i) => (i === 0 ? piece : `${out}${originals[i - 1]}${piece}`))
}
