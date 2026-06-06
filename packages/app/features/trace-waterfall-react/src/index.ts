/**
 * Distributed-trace span waterfall visualization.
 *
 * Exports `<TraceWaterfall>`, the `Span` / `SpanStatus` / `SpanRow` /
 * `SpanLayout` types, and the pure `layoutSpans()` / `serviceColor()` /
 * `formatDurationLabel()` helpers used to position rows.
 *
 * @example
 * ```tsx
 * import { TraceWaterfall } from '@molecule/app-trace-waterfall-react'
 *
 * <TraceWaterfall
 *   spans={[
 *     { id: 'root', name: 'GET /checkout', service: 'api-gw', startTime: 0, duration: 320, status: 'ok' },
 *     { id: 'auth', parentId: 'root', name: 'verifyToken', service: 'auth-svc', startTime: 5, duration: 40, status: 'ok' },
 *     { id: 'db', parentId: 'root', name: 'db.query', service: 'postgres', startTime: 50, duration: 210, status: 'ok' },
 *     { id: 'cache', parentId: 'root', name: 'cache.get', service: 'redis', startTime: 45, duration: 8, status: 'error' },
 *   ]}
 *   onSpanClick={(span) => console.log('selected', span.id)}
 *   emptyState={<p>No trace data.</p>}
 * />
 * ```
 *
 * @module
 */

export * from './layout.js'
export * from './TraceWaterfall.js'
export * from './types.js'
