# @molecule/app-word-cloud-react

Word cloud visualization with hand-rolled spiral packing. SVG-based, no
library dependency, configurable size / palette / orientation,
accessible per-word `aria-label`-via-text and `data-mol-id` attributes.

Used by voting-polling (the `wordcloud` question type) and reusable for
survey results, news-topic clouds, tag analytics, and any "weighted
vocabulary" visualization.

## Quick Start

```tsx
import { WordCloud } from '@molecule/app-word-cloud-react'

<WordCloud
  words={[
    { text: 'molecule', value: 42 },
    { text: 'react', value: 30 },
    { text: 'svg', value: 18 },
  ]}
  onWordClick={(w) => console.log(w.text, w.value)}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-word-cloud-react @molecule/app-react @molecule/app-ui react
npm install -D @types/react
```

## API

### Interfaces

#### `PlacedWord`

Resolved placement of a single word, ready for SVG rendering.

```typescript
interface PlacedWord {
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
```

#### `Word`

A single word datum: text + numeric weight + optional explicit color.

```typescript
interface Word {
  /** The word text. */
  text: string
  /** Numeric weight (frequency, votes, score, etc.) — drives font size. */
  value: number
  /** Optional explicit color overriding `colorScale`. */
  color?: string
}
```

#### `WordCloudProps`

Word cloud component props.

```typescript
interface WordCloudProps {
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
```

### Types

#### `WordCloudOrientation`

Orientation modes for word rotation.

```typescript
type WordCloudOrientation = 'horizontal' | 'mixed'
```

### Functions

#### `bboxesIntersect(a, b)`

Test whether two axis-aligned bounding boxes intersect.

```typescript
function bboxesIntersect(a: BBox, b: BBox): boolean
```

- `a` — First bbox.
- `b` — Second bbox.

**Returns:** `true` if the boxes overlap, `false` otherwise.

#### `estimateBBox(text, fontSize, rotation, cx, cy)`

Estimate a word's rendered bounding box (centered on `cx`, `cy`).

Pure geometry — no DOM measurement — using `GLYPH_WIDTH_RATIO` *
`fontSize` * text length for width and `GLYPH_HEIGHT_RATIO` * `fontSize`
for height. If `rotation === 90`, swaps width/height. Adds a 2px padding
on each side so neighbors don't visually touch.

```typescript
function estimateBBox(text: string, fontSize: number, rotation: number, cx: number, cy: number): BBox
```

- `text` — The word text whose box is being estimated.
- `fontSize` — Font size in px.
- `rotation` — Rotation in degrees (0 or 90).
- `cx` — X coordinate of the word's center.
- `cy` — Y coordinate of the word's center.

**Returns:** Axis-aligned bounding box in SVG units.

#### `packWords(words, options)`

Hand-rolled spiral packing for word clouds.

Sorts words by descending `value`, places the largest at the center, then
for each subsequent word walks an Archimedean spiral (`r = SPIRAL_STEP * a`)
outward from the center, testing the candidate bounding box against every
already-placed bbox. The first collision-free position wins. Words that
cannot be placed within `SPIRAL_MAX_ANGLE` are dropped.

Pure function — no React, no DOM — so it can be unit-tested standalone
and reused by other renderers (canvas, native, server-side rendering).

```typescript
function packWords(words: Word[], options: { width: number; height: number; minFontSize: number; maxFontSize: number; orientation?: WordCloudOrientation; }): PlacedWord[]
```

- `words` — The words to pack.
- `options` — Packing options.
- `options.width` — Available width in px.
- `options.height` — Available height in px.
- `options.minFontSize` — Smallest font size in px.
- `options.maxFontSize` — Largest font size in px.
- `options.orientation` — `'horizontal'` or `'mixed'` (every 4th word at 90deg).

**Returns:** Array of `PlacedWord` objects, in placement order.

#### `scaleFontSize(value, minValue, maxValue, minFontSize, maxFontSize)`

Linearly map a numeric weight to a font size between `minFontSize` and
`maxFontSize`, given the min and max weights observed in the input.

```typescript
function scaleFontSize(value: number, minValue: number, maxValue: number, minFontSize: number, maxFontSize: number): number
```

- `value` — The weight to map.
- `minValue` — Smallest weight in the dataset.
- `maxValue` — Largest weight in the dataset.
- `minFontSize` — Smallest font size to emit.
- `maxFontSize` — Largest font size to emit.

**Returns:** A font size in `[minFontSize, maxFontSize]`.

#### `WordCloud(props)`

Word cloud visualization — renders each word at a font size proportional
to its `value`, packed with a hand-rolled spiral algorithm so larger
words sit nearest the center. SVG output, no external library.

Designed for voting-polling (the `wordcloud` question type), survey
results, news topics, tag analytics, and any other "weighted vocabulary"
surface. All UI text routes through `t('word-cloud.*')` from
`@molecule/app-react`'s `useTranslation()`; drop in
`@molecule/app-locales-word-cloud` for translated aria labels.

Styling goes through `@molecule/app-ui`'s `getClassMap()`; the only
inline styling is the SVG `fill` attribute (a real SVG attribute, not
a Tailwind class) and the `cursor: pointer` style on clickable words.

```typescript
function WordCloud({
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
}: WordCloudProps): JSX.Element
```

- `props` — Component props (see {@link WordCloudProps}).

**Returns:** The word cloud SVG element.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

### Runtime Dependencies

- `@molecule/app-react`
- `@molecule/app-ui`
- `react`

All UI text routes through `t('word-cloud.*')` from
`@molecule/app-react`'s `useTranslation()`. Drop in
`@molecule/app-locales-word-cloud` for translated aria labels.

The pure helper `packWords()` is exported for testing and for reuse by
non-React renderers (canvas, native, server-side).

## Translations

Translation strings are provided by `@molecule/app-locales-word-cloud`.
