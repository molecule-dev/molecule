/**
 * Distributed-trace span waterfall visualization.
 *
 * Exports `<TraceWaterfall>`, the `Span` / `SpanStatus` / `SpanRow` /
 * `SpanLayout` types, and the pure `layoutSpans()` / `serviceColor()` /
 * `formatDurationLabel()` helpers used to position rows.
 *
 * @module
 */

export * from './layout.js'
export * from './TraceWaterfall.js'
export * from './types.js'
