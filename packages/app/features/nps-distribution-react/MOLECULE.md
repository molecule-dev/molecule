# @molecule/app-nps-distribution-react

React Net Promoter Score distribution chart.

Exports `<NpsDistribution>` — 11-row 0..10 horizontal bar chart with
detractor / passive / promoter color tiers and an optional computed
NPS score line. Used by the survey-feedback-tool flagship.

The pure helper `computeNps(scores, detractorMax?, passiveMax?)` is
also exported so callers can run the math without rendering.

## Quick Start

```tsx
import { NpsDistribution, computeNps } from '@molecule/app-nps-distribution-react'

const scores = [10, 9, 9, 7, 6, 0, 8, 10]
const { score } = computeNps(scores)

function ResultsCard() {
  return <NpsDistribution scores={scores} />
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-nps-distribution-react
```

## API

### Interfaces

#### `NpsBucket`

Per-score row computed from the `scores` input.

Used internally and re-exported so callers can render their own
legends / tooltips without re-deriving the bucket data.

```typescript
interface NpsBucket {
  /** Survey score (0..10). */
  score: number
  /** Number of responses with this score. */
  count: number
  /** Tier the score belongs to (drives bar color). */
  tier: NpsTier
}
```

#### `NpsDistributionProps`

Props for `<NpsDistribution>`.

```typescript
interface NpsDistributionProps {
  /**
   * Raw 0..10 scores. Out-of-range or non-integer values are ignored.
   * The component does not mutate the array.
   */
  scores: number[]
  /**
   * Whether to render the computed NPS score line below the bars.
   * Defaults to `true`.
   */
  showScore?: boolean
  /**
   * Highest score still classified as a detractor. Defaults to `6`
   * (NPS standard: 0–6 detractors).
   */
  detractorMax?: number
  /**
   * Highest score still classified as a passive. Defaults to `8`
   * (NPS standard: 7–8 passives, 9–10 promoters).
   */
  passiveMax?: number
  /** Extra classes on the outer wrapper. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
```

#### `NpsResult`

Pure-data result returned by {@link computeNps}.

- `score` — Net Promoter Score, range -100..100, rounded to nearest integer.
  Returns `0` when `total === 0` so consumers don't have to special-case
  empty datasets (callers can hide the score with `showScore={false}`).
- `total` — total response count.
- `detractors` / `passives` / `promoters` — per-tier response counts.
- `buckets` — per-score rows in display order (0 → 10).

```typescript
interface NpsResult {
  score: number
  total: number
  detractors: number
  passives: number
  promoters: number
  buckets: NpsBucket[]
}
```

### Types

#### `NpsTier`

NPS bucket tier — drives the bar color in the distribution chart.

- `'detractor'` — score 0..detractorMax (inclusive, default 0..6).
- `'passive'` — score (detractorMax+1)..passiveMax (default 7..8).
- `'promoter'` — score (passiveMax+1)..10 (default 9..10).

```typescript
type NpsTier = 'detractor' | 'passive' | 'promoter'
```

### Functions

#### `computeNps(scores, detractorMax, passiveMax)`

Compute the Net Promoter Score plus per-bucket totals from a raw scores array.

Pure helper — no React, no DOM. Exported so callers can run the math
without rendering, e.g. in summary cards or test assertions.

Formula: `NPS = ( (#promoters / total) - (#detractors / total) ) * 100`,
rounded to the nearest integer. Range: -100..100. Returns `0` when
`total === 0` to keep the type non-nullable; the caller decides whether
to display the score for empty datasets via the `showScore` prop on
`<NpsDistribution>`.

Out-of-range scores (negative, > 10, non-integer, NaN, non-finite) are
silently dropped so a rogue input value can't poison the chart.

```typescript
function computeNps(scores: number[], detractorMax?: number, passiveMax?: number): NpsResult
```

- `scores` — Raw survey scores.
- `detractorMax` — Highest detractor score (default 6).
- `passiveMax` — Highest passive score (default 8).

**Returns:** The {@link NpsResult} with score, totals, and per-score buckets.

#### `NpsDistribution(props)`

Net Promoter Score distribution chart — survey-feedback-tool flagship.

Renders an 11-row horizontal bar chart (one row per score 0..10) with
detractor / passive / promoter color tiers. Bar widths are scaled
relative to the tallest bucket so the busiest score always reaches
100% of the track. Below the bars an optional NPS score line shows
the computed score (range -100..100) and total response count.

Color tiers and the score line both pull from semantic
`var(--mol-color-*)` custom properties, so swapping the ClassMap bond
(Tailwind → Bootstrap → …) re-themes the chart automatically.

```typescript
function NpsDistribution({
  scores,
  showScore = true,
  detractorMax = 6,
  passiveMax = 8,
  className,
  dataMolId,
}: NpsDistributionProps): React.ReactElement<unknown, string | React.JSXElementConstructor<any>>
```

- `props` — Component props.

**Returns:** The rendered NPS distribution element.

#### `tierFor(score, detractorMax, passiveMax)`

Resolve the tier for a single score given the configured cutoffs.

```typescript
function tierFor(score: number, detractorMax: number, passiveMax: number): NpsTier
```

- `score` — The 0..10 survey score.
- `detractorMax` — Highest score still classified as detractor.
- `passiveMax` — Highest score still classified as passive.

**Returns:** The {@link NpsTier} the score falls into.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

Bar widths scale relative to the tallest bucket. Color tiers map to
the semantic ClassMap CSS custom properties
(`--mol-color-error|warning|success`) so the chart re-themes
automatically when the ClassMap bond is swapped. All user-facing text
goes through `t()` with companion locale bond
`@molecule/app-locales-nps-distribution-react`.

## Translations

Translation strings are provided by `@molecule/app-locales-nps-distribution`.
