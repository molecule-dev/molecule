/**
 * Types of `@molecule/app-word-cloud-solid` — the Solid counterpart of
 * `@molecule/app-word-cloud-react`, with the same props and the same DOM.
 *
 * @module
 */

/** A single word datum: text + numeric weight + optional explicit color. */
export interface Word {
  /** The word text. */
  text: string
  /** Numeric weight (frequency, votes, score, etc.) — drives font size. */
  value: number
  /** Optional explicit color overriding `colorScale`. */
  color?: string
}

/** Orientation modes for word rotation. */
export type WordCloudOrientation = 'horizontal' | 'mixed'

/** Resolved placement of a single word, ready for SVG rendering. */
export interface PlacedWord {
  /** The source word datum. */
  word: Word
  /** X coordinate of the word's center, in SVG units. */
  x: number
  /** Y coordinate of the word's center, in SVG units. */
  y: number
  /** Resolved font size in px. */
  fontSize: number
  /** Resolved rotation in degrees (0 or 90 for `'mixed'`). */
  rotation: number
}

/** Word cloud component props (the same names `@molecule/app-word-cloud-react` takes). */
export interface WordCloudProps {
  /** Words to render, in any order — placement is sorted internally by `value`. */
  words: Word[]
  /** SVG width in px. Defaults to 400. */
  width?: number
  /** SVG height in px. Defaults to 300. */
  height?: number
  /** Smallest font size for the lowest-weight word. Defaults to 12. */
  minFontSize?: number
  /** Largest font size for the highest-weight word. Defaults to 64. */
  maxFontSize?: number
  /**
   * Color palette cycled through for words without an explicit `color`.
   * Defaults to a 5-color qualitative palette.
   */
  colorScale?: readonly string[]
  /**
   * `'horizontal'` (default) places every word at 0deg.
   * `'mixed'` alternates 0deg and 90deg in a deterministic pattern so that
   * roughly every fourth word is rotated.
   */
  orientation?: WordCloudOrientation
  /** Click handler — invoked with the original `Word`. */
  onWordClick?: (word: Word) => void
  /** Optional accessible label for the whole SVG. Falls back to i18n default. */
  ariaLabel?: string
  /** Extra classes merged onto the SVG root via `cm.cn`. */
  className?: string
}
