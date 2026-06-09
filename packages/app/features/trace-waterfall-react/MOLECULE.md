# @molecule/app-trace-waterfall-react

Distributed-trace span waterfall visualization.

Exports `<TraceWaterfall>`, the `Span` / `SpanStatus` / `SpanRow` /
`SpanLayout` types, and the pure `layoutSpans()` / `serviceColor()` /
`formatDurationLabel()` helpers used to position rows.

## Quick Start

```tsx
import { TraceWaterfall } from '@molecule/app-trace-waterfall-react'

<TraceWaterfall
  spans={[
    { id: 'root', name: 'GET /checkout', service: 'api-gw', startTime: 0, duration: 320, status: 'ok' },
    { id: 'auth', parentId: 'root', name: 'verifyToken', service: 'auth-svc', startTime: 5, duration: 40, status: 'ok' },
    { id: 'db', parentId: 'root', name: 'db.query', service: 'postgres', startTime: 50, duration: 210, status: 'ok' },
    { id: 'cache', parentId: 'root', name: 'cache.get', service: 'redis', startTime: 45, duration: 8, status: 'error' },
  ]}
  onSpanClick={(span) => console.log('selected', span.id)}
  emptyState={<p>No trace data.</p>}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-trace-waterfall-react
```

## API

### Interfaces

#### `Span`

A single distributed-trace span. Times are numeric (ms or any consistent
unit — `startTime` and `duration` must share a unit). The tree is formed
by `parentId` references; spans without a `parentId` (or whose `parentId`
isn't present in the input array) are roots.

```typescript
interface Span {
  /** Stable id for this span. */
  id: string
  /** Id of the parent span; omit (or set undefined) for a root span. */
  parentId?: string
  /** Operation name (e.g. `GET /users/:id`, `db.query`). */
  name: string
  /** Service / component label that emitted this span (e.g. `auth-api`). */
  service?: string
  /**
   * Start time relative to some shared origin. Any unit is fine as long as
   * it matches `duration`; the trace is auto-scaled to its own min/max.
   */
  startTime: number
  /** Duration in the same unit as `startTime`. Must be >= 0. */
  duration: number
  /** Optional status; controls the bar color. */
  status?: SpanStatus
  /** Optional structured attributes (tags, key/value pairs). */
  attributes?: Record<string, unknown>
}
```

#### `SpanLayout`

Output of `layoutSpans`: ordered rows + the trace's absolute time bounds.

```typescript
interface SpanLayout {
  /** Rows in render order (depth-first, sorted by `startTime`). */
  rows: SpanRow[]
  /** Earliest `startTime` across all spans (the trace origin on the axis). */
  traceStart: number
  /** Latest end time (`startTime + duration`) across all spans. */
  traceEnd: number
  /** `traceEnd - traceStart`, clamped to a minimum of `1` to avoid divide-by-zero. */
  traceDuration: number
}
```

#### `SpanRow`

Layout metadata computed for a single span row.

```typescript
interface SpanRow {
  /** The original span. */
  span: Span
  /** Zero-based depth in the parent tree (root === 0). */
  depth: number
  /** Position of the bar's left edge as a fraction `[0, 1]` of the trace duration. */
  startFraction: number
  /** Width of the bar as a fraction `[0, 1]` of the trace duration. */
  widthFraction: number
}
```

#### `TraceWaterfallProps`

Public props for `<TraceWaterfall>`.

```typescript
interface TraceWaterfallProps {
  /** Flat list of spans; tree is derived from `parentId` references. */
  spans: Span[]
  /** Optional root span id to focus the view on a single subtree. */
  rootSpanId?: string
  /** Click handler invoked when a span row (label or bar) is selected. */
  onSpanClick?: (span: Span) => void
  /** Optional content shown when `spans` is empty. */
  emptyState?: React.ReactNode
  /** Extra classes merged onto the root via `cm.cn`. */
  className?: string
}
```

### Types

#### `SpanStatus`

Status indicator for a span. Mirrors common OTel-style status semantics.

```typescript
type SpanStatus = 'ok' | 'error' | 'pending'
```

### Functions

#### `formatDurationLabel(value)`

Format a duration value (in the same unit as `Span.startTime`) as a
short, human-readable string: `< 1` → microseconds, `< 1000` → ms,
otherwise seconds with one decimal.

```typescript
function formatDurationLabel(value: number): string
```

- `value` — The numeric value to format.

**Returns:** A short label string.

#### `layoutSpans(spans, rootSpanId)`

Build a hierarchical, time-positioned layout for a flat list of spans.

Behavior:
- Spans are linked by `parentId`. A span whose `parentId` is missing from
  the input (or undefined) is treated as a root.
- If `rootSpanId` is provided AND that id exists in the input, the
  layout is restricted to that span and its descendants. Otherwise every
  root contributes its own subtree.
- Children are sorted by `startTime` ascending (stable for equal times).
- `traceStart` / `traceEnd` are derived from the included spans only.
- `traceDuration` is clamped to `>= 1` so callers can safely divide.

The output is intentionally framework-agnostic: callers (such as
`<TraceWaterfall>`) can render the rows however they like.

```typescript
function layoutSpans(spans: Span[], rootSpanId?: string): SpanLayout
```

- `spans` — Flat list of spans, in any order.
- `rootSpanId` — Optional id to use as the visible root.

**Returns:** Layout rows, sorted depth-first, with normalized fractions.

#### `serviceColor(service)`

Deterministically derive a hex color from a service name. Used for the
color tag next to each span row. Same input always yields the same color
across renders so a service is visually stable.

```typescript
function serviceColor(service: string): string
```

- `service` — Service / component label.

**Returns:** A hex color string suitable for an inline `style.background`.

#### `TraceWaterfall(props, props, props, props, props, props)`

Datadog/Jaeger-style distributed-trace waterfall. Renders each span as
a horizontal bar positioned by `startTime`, scaled to total trace
duration, indented by parent depth. A time axis is rendered along the
top with `AXIS_TICK_COUNT` evenly spaced ticks. Service name is shown
as a colored tag next to the operation name; bar color encodes status.

Styling is fully ClassMap-driven for layout. Only color attributes
(status colors, service-tag colors, bar fill) and pixel-perfect axis
geometry use inline `style` — these are properties ClassMap does not
model. Translations come from `@molecule/app-locales-trace-waterfall`.

Used by api-testing-tool, error-tracker, log-viewer, and any other
developer tooling that consumes distributed-trace data.

```typescript
function TraceWaterfall({
  spans,
  rootSpanId,
  onSpanClick,
  emptyState,
  className,
}: TraceWaterfallProps): ReactElement<unknown, string | JSXElementConstructor<any>> | null
```

- `props` — Component props.
- `props` — .spans - Flat list of spans.
- `props` — .rootSpanId - Optional focus span id.
- `props` — .onSpanClick - Optional row-click callback.
- `props` — .emptyState - Optional fallback when `spans` is empty.
- `props` — .className - Extra classes for the root.

**Returns:** The waterfall element tree.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-trace-waterfall`.
