# @molecule/app-bias-indicator-react

React political-bias / source-credibility indicator.

Exports `<BiasIndicator>` — left/right scale with marker plus
optional reliability dot/chip — for news-aggregator article
headers and dense article lists (compact variant).

## Quick Start

```tsx
import { BiasIndicator } from '@molecule/app-bias-indicator-react'

<BiasIndicator bias={-0.4} reliability={0.8} sourceLabel="Reuters" />
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-bias-indicator-react
```

## API

### Interfaces

#### `BiasIndicatorProps`

Props for `<BiasIndicator>`.

```typescript
interface BiasIndicatorProps {
  /**
   * Bias scalar from `-1` (far left) through `0` (center) to `+1`
   * (far right). Values are clamped before rendering.
   */
  bias: number
  /**
   * Optional source-credibility / reliability score from `0` (lowest /
   * disputed) to `1` (highest). When omitted, no reliability indicator
   * is rendered.
   */
  reliability?: number
  /**
   * Compact variant collapses the scale to a single coloured dot —
   * useful for dense lists. Defaults to `false`.
   */
  compact?: boolean
  /** Optional source name (e.g. `'Reuters'`). Renders as a small caption. */
  sourceLabel?: ReactNode
  /** Extra classes to merge onto the root element. */
  className?: string
  /** `data-mol-id` for AI-agent / E2E selectors. */
  dataMolId?: string
}
```

### Types

#### `BiasBucket`

Bias bucket — drives the bias-marker hue and the screen-reader label.
Derived from a -1..1 bias scalar by `biasToBucket`.

```typescript
type BiasBucket = 'far-left' | 'left' | 'center' | 'right' | 'far-right'
```

#### `ReliabilityTier`

Reliability tier — drives the colour + label of the optional dot/chip.
Mapped from a 0..1 reliability score by `reliabilityToTier`.

```typescript
type ReliabilityTier = 'high' | 'medium' | 'low' | 'disputed'
```

### Functions

#### `BiasIndicator(props, props, props, props, props, props, props)`

Political-bias / source-credibility indicator for news article
headers. Renders a horizontal `-1..+1` scale with a coloured marker
at `bias`, plus an optional reliability dot/chip below. The compact
variant collapses to a single coloured dot, suitable for dense
article lists.

Colours come from semantic CSS custom properties (`--color-info`,
`--color-warning`, `--color-error`, `--color-success`,
`--color-foreground-secondary`) so per-app theming flows through
without code changes.

```typescript
function BiasIndicator({
  bias,
  reliability,
  compact = false,
  sourceLabel,
  className,
  dataMolId,
}: BiasIndicatorProps): ReactElement<unknown, string | JSXElementConstructor<any>>
```

- `props` — Component props.
- `props` — .bias - Bias scalar (-1 far left … +1 far right).
- `props` — .reliability - Optional 0..1 reliability score.
- `props` — .compact - Render only the coloured dot.
- `props` — .sourceLabel - Optional source caption.
- `props` — .className - Extra classes.
- `props` — .dataMolId - `data-mol-id` for AI / E2E selectors.

**Returns:** The rendered indicator.

#### `biasToBucket(bias)`

Map a `-1..1` bias scalar into a coarse five-bucket label used for
accessibility and colouring. Boundaries: `<= -0.6` far-left,
`<= -0.2` left, `< 0.2` center, `< 0.6` right, otherwise far-right.

```typescript
function biasToBucket(bias: number): BiasBucket
```

- `bias` — Bias scalar (clamped to `[-1, 1]` first).

**Returns:** The bias bucket.

#### `biasToPercent(bias)`

Convert a `-1..1` bias value into a `0..100` percent offset for
absolute positioning along the scale track.

```typescript
function biasToPercent(bias: number): number
```

- `bias` — Bias scalar (clamped to `[-1, 1]` first).

**Returns:** The percent offset from the left edge of the track.

#### `bucketColor(bucket)`

Resolve the marker colour for a given bias bucket. Uses semantic CSS
custom properties so swapping themes / styling libraries does not
require touching this component.

```typescript
function bucketColor(bucket: BiasBucket): string
```

- `bucket` — Bias bucket.

**Returns:** A `var(--…)` CSS color string.

#### `clamp(value, min, max)`

Clamp a number into the inclusive `[min, max]` range.

```typescript
function clamp(value: number, min: number, max: number): number
```

- `value` — Value to clamp.
- `min` — Lower bound.
- `max` — Upper bound.

**Returns:** The clamped value.

#### `reliabilityToTier(reliability)`

Map a `0..1` reliability score into a four-tier label. Boundaries:
`>= 0.75` high, `>= 0.5` medium, `>= 0.25` low, otherwise disputed.

```typescript
function reliabilityToTier(reliability: number): ReliabilityTier
```

- `reliability` — Reliability scalar (clamped to `[0, 1]` first).

**Returns:** The reliability tier.

#### `tierColor(tier)`

Resolve the dot colour for a given reliability tier.

```typescript
function tierColor(tier: ReliabilityTier): string
```

- `tier` — Reliability tier.

**Returns:** A `var(--…)` CSS color string.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-bias-indicator`.
