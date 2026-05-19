import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

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

/** Word cloud component props. */
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

const DEFAULT_PALETTE = ['#2563eb', '#16a34a', '#dc2626', '#9333ea', '#f59e0b'] as const

/** Average glyph-width-to-fontSize ratio for collision math. Approximate. */
const GLYPH_WIDTH_RATIO = 0.55
/** Glyph-height-to-fontSize ratio for collision math (line-box). */
const GLYPH_HEIGHT_RATIO = 1.0
/** Spiral step size in px per radian. Smaller = denser packing, slower. */
const SPIRAL_STEP = 1.2
/** Max angle (radians) the spiral search will sweep before giving up. */
const SPIRAL_MAX_ANGLE = Math.PI * 2 * 40

/** Axis-aligned bounding box used for collision tests. */
interface BBox {
  /** Left edge. */
  x: number
  /** Top edge. */
  y: number
  /** Width. */
  w: number
  /** Height. */
  h: number
}

/**
 * Estimate a word's rendered bounding box (centered on `cx`, `cy`).
 *
 * Pure geometry — no DOM measurement — using `GLYPH_WIDTH_RATIO` *
 * `fontSize` * text length for width and `GLYPH_HEIGHT_RATIO` * `fontSize`
 * for height. If `rotation === 90`, swaps width/height. Adds a 2px padding
 * on each side so neighbors don't visually touch.
 *
 * @param text - The word text whose box is being estimated.
 * @param fontSize - Font size in px.
 * @param rotation - Rotation in degrees (0 or 90).
 * @param cx - X coordinate of the word's center.
 * @param cy - Y coordinate of the word's center.
 * @returns Axis-aligned bounding box in SVG units.
 */
export function estimateBBox(
  text: string,
  fontSize: number,
  rotation: number,
  cx: number,
  cy: number,
): BBox {
  const w = text.length * fontSize * GLYPH_WIDTH_RATIO
  const h = fontSize * GLYPH_HEIGHT_RATIO
  const padding = 2
  const boxW = (rotation === 90 ? h : w) + padding * 2
  const boxH = (rotation === 90 ? w : h) + padding * 2
  return { x: cx - boxW / 2, y: cy - boxH / 2, w: boxW, h: boxH }
}

/**
 * Test whether two axis-aligned bounding boxes intersect.
 *
 * @param a - First bbox.
 * @param b - Second bbox.
 * @returns `true` if the boxes overlap, `false` otherwise.
 */
export function bboxesIntersect(a: BBox, b: BBox): boolean {
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y)
}

/**
 * Linearly map a numeric weight to a font size between `minFontSize` and
 * `maxFontSize`, given the min and max weights observed in the input.
 *
 * @param value - The weight to map.
 * @param minValue - Smallest weight in the dataset.
 * @param maxValue - Largest weight in the dataset.
 * @param minFontSize - Smallest font size to emit.
 * @param maxFontSize - Largest font size to emit.
 * @returns A font size in `[minFontSize, maxFontSize]`.
 */
export function scaleFontSize(
  value: number,
  minValue: number,
  maxValue: number,
  minFontSize: number,
  maxFontSize: number,
): number {
  if (maxValue <= minValue) return (minFontSize + maxFontSize) / 2
  const t = (value - minValue) / (maxValue - minValue)
  return minFontSize + t * (maxFontSize - minFontSize)
}

/**
 * Hand-rolled spiral packing for word clouds.
 *
 * Sorts words by descending `value`, places the largest at the center, then
 * for each subsequent word walks an Archimedean spiral (`r = SPIRAL_STEP * a`)
 * outward from the center, testing the candidate bounding box against every
 * already-placed bbox. The first collision-free position wins. Words that
 * cannot be placed within `SPIRAL_MAX_ANGLE` are dropped.
 *
 * Pure function — no React, no DOM — so it can be unit-tested standalone
 * and reused by other renderers (canvas, native, server-side rendering).
 *
 * @param words - The words to pack.
 * @param options - Packing options.
 * @param options.width - Available width in px.
 * @param options.height - Available height in px.
 * @param options.minFontSize - Smallest font size in px.
 * @param options.maxFontSize - Largest font size in px.
 * @param options.orientation - `'horizontal'` or `'mixed'` (every 4th word at 90deg).
 * @returns Array of `PlacedWord` objects, in placement order.
 */
export function packWords(
  words: Word[],
  options: {
    width: number
    height: number
    minFontSize: number
    maxFontSize: number
    orientation?: WordCloudOrientation
  },
): PlacedWord[] {
  const { width, height, minFontSize, maxFontSize, orientation = 'horizontal' } = options
  if (words.length === 0) return []

  const sorted = [...words].sort((a, b) => b.value - a.value)
  const minValue = sorted[sorted.length - 1].value
  const maxValue = sorted[0].value

  const cx = width / 2
  const cy = height / 2
  const placed: PlacedWord[] = []
  const placedBoxes: BBox[] = []

  for (let i = 0; i < sorted.length; i++) {
    const word = sorted[i]
    const fontSize = scaleFontSize(word.value, minValue, maxValue, minFontSize, maxFontSize)
    const rotation = orientation === 'mixed' && i % 4 === 3 ? 90 : 0

    let placedAt: { x: number; y: number } | null = null

    // Try center first (for the very first word, this always succeeds).
    {
      const box = estimateBBox(word.text, fontSize, rotation, cx, cy)
      const insideBounds =
        box.x >= 0 && box.y >= 0 && box.x + box.w <= width && box.y + box.h <= height
      const collides = placedBoxes.some((p) => bboxesIntersect(box, p))
      if (insideBounds && !collides) {
        placedAt = { x: cx, y: cy }
        placedBoxes.push(box)
      }
    }

    // Walk an Archimedean spiral outward.
    if (!placedAt) {
      for (let a = 0; a < SPIRAL_MAX_ANGLE; a += 0.1) {
        const r = SPIRAL_STEP * a
        const tx = cx + r * Math.cos(a)
        const ty = cy + r * Math.sin(a)
        const box = estimateBBox(word.text, fontSize, rotation, tx, ty)
        const insideBounds =
          box.x >= 0 && box.y >= 0 && box.x + box.w <= width && box.y + box.h <= height
        if (!insideBounds) continue
        const collides = placedBoxes.some((p) => bboxesIntersect(box, p))
        if (!collides) {
          placedAt = { x: tx, y: ty }
          placedBoxes.push(box)
          break
        }
      }
    }

    if (placedAt) {
      placed.push({ word, x: placedAt.x, y: placedAt.y, fontSize, rotation })
    }
  }

  return placed
}

/**
 * Word cloud visualization — renders each word at a font size proportional
 * to its `value`, packed with a hand-rolled spiral algorithm so larger
 * words sit nearest the center. SVG output, no external library.
 *
 * Designed for voting-polling (the `wordcloud` question type), survey
 * results, news topics, tag analytics, and any other "weighted vocabulary"
 * surface. All UI text routes through `t('word-cloud.*')` from
 * `@molecule/app-react`'s `useTranslation()`; drop in
 * `@molecule/app-locales-word-cloud` for translated aria labels.
 *
 * Styling goes through `@molecule/app-ui`'s `getClassMap()`; the only
 * inline styling is the SVG `fill` attribute (a real SVG attribute, not
 * a Tailwind class) and the `cursor: pointer` style on clickable words.
 *
 * @param root0 - Component props.
 * @param root0.words - Word list.
 * @param root0.width - SVG width in px.
 * @param root0.height - SVG height in px.
 * @param root0.minFontSize - Smallest font size.
 * @param root0.maxFontSize - Largest font size.
 * @param root0.colorScale - Palette cycled through for un-colored words.
 * @param root0.orientation - `'horizontal'` or `'mixed'`.
 * @param root0.onWordClick - Click handler called with the source `Word`.
 * @param root0.ariaLabel - Accessible label for the SVG root.
 * @param root0.className - Extra classes merged onto the SVG root.
 * @returns The word cloud SVG element.
 */
export function WordCloud({
  words,
  width = 400,
  height = 300,
  minFontSize = 12,
  maxFontSize = 64,
  colorScale = DEFAULT_PALETTE,
  orientation = 'horizontal',
  onWordClick,
  ariaLabel,
  className,
}: WordCloudProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const placed = packWords(words, { width, height, minFontSize, maxFontSize, orientation })

  const rootLabel = ariaLabel ?? t('word-cloud.aria.cloud', {}, { defaultValue: 'Word cloud' })
  const emptyLabel = t('word-cloud.aria.empty', {}, { defaultValue: 'No words to display' })

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={placed.length === 0 ? emptyLabel : rootLabel}
      data-mol-id="word-cloud"
      className={cm.cn(className)}
    >
      {placed.map((p, i) => {
        const fill = p.word.color ?? colorScale[i % colorScale.length]
        const transform = p.rotation === 0 ? undefined : `rotate(${p.rotation} ${p.x} ${p.y})`
        return (
          <text
            key={`${p.word.text}-${i}`}
            x={p.x}
            y={p.y}
            fontSize={p.fontSize}
            fill={fill}
            textAnchor="middle"
            dominantBaseline="central"
            transform={transform}
            data-mol-id={`word-cloud-word-${p.word.text}`}
            data-value={p.word.value}
            data-rotation={p.rotation}
            tabIndex={onWordClick ? 0 : -1}
            onClick={onWordClick ? () => onWordClick(p.word) : undefined}
            style={{ cursor: onWordClick ? 'pointer' : undefined }}
          >
            {p.word.text}
          </text>
        )
      })}
    </svg>
  )
}
