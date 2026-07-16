/** Status indicator for a span. Mirrors common OTel-style status semantics. */
export type SpanStatus = 'ok' | 'error' | 'pending'

/**
 * A single distributed-trace span. Times are numeric milliseconds (labels
 * assume ms; layout is unit-agnostic) — `startTime` and `duration` must
 * share a unit. The tree is formed by `parentId` references; spans without
 * a `parentId` (or whose `parentId` isn't present in the input array) are
 * roots.
 */
export interface Span {
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

/** Layout metadata computed for a single span row. */
export interface SpanRow {
  /** The original span. */
  span: Span
  /** Zero-based depth in the parent tree (root === 0). */
  depth: number
  /** Position of the bar's left edge as a fraction `[0, 1]` of the trace duration. */
  startFraction: number
  /** Width of the bar as a fraction `[0, 1]` of the trace duration. */
  widthFraction: number
}

/** Output of `layoutSpans`: ordered rows + the trace's absolute time bounds. */
export interface SpanLayout {
  /** Rows in render order (depth-first, sorted by `startTime`). */
  rows: SpanRow[]
  /** Earliest `startTime` across all spans (the trace origin on the axis). */
  traceStart: number
  /** Latest end time (`startTime + duration`) across all spans. */
  traceEnd: number
  /** `traceEnd - traceStart`, clamped to a minimum of `1` to avoid divide-by-zero. */
  traceDuration: number
}
