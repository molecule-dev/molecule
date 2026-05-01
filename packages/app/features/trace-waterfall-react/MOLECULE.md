# @molecule/app-trace-waterfall-react

Distributed-trace span waterfall visualization.

Exports `<TraceWaterfall>`, the `Span` / `SpanStatus` / `SpanRow` /
`SpanLayout` types, and the pure `layoutSpans()` / `serviceColor()` /
`formatDurationLabel()` helpers used to position rows.

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

### Types

#### `SpanStatus`

Status indicator for a span. Mirrors common OTel-style status semantics.

```typescript
type SpanStatus = 'ok' | 'error' | 'pending'
```

### Functions

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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-trace-waterfall-react`.
