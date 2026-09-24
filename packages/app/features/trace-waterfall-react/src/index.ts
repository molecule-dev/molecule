/**
 * Distributed-trace span waterfall visualization.
 *
 * Exports `<TraceWaterfall>`, the `Span` / `SpanStatus` / `SpanRow` /
 * `SpanLayout` types, and the pure `layoutSpans()` / `serviceColor()` /
 * `formatDurationLabel()` helpers used to position rows.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { type Span, TraceWaterfall } from '@molecule/app-trace-waterfall-react'
 *
 * const spans: Span[] = [
 *   { id: 'root', name: 'GET /checkout', service: 'api-gw', startTime: 0, duration: 320, status: 'ok' },
 *   { id: 'auth', parentId: 'root', name: 'verifyToken', service: 'auth-svc', startTime: 5, duration: 40, status: 'ok' },
 *   { id: 'cache', parentId: 'root', name: 'cache.get', service: 'redis', startTime: 45, duration: 8, status: 'error' },
 *   { id: 'db', parentId: 'root', name: 'db.query', service: 'postgres', startTime: 50, duration: 210, attributes: { rows: 42 } },
 * ]
 *
 * export function TraceDetail() {
 *   const [selected, setSelected] = useState<Span | null>(null)
 *   return (
 *     <section>
 *       <TraceWaterfall spans={spans} onSpanClick={setSelected} emptyState={<p>No trace data.</p>} />
 *       {selected && (
 *         <pre>
 *           {selected.name}: {JSON.stringify(selected.attributes ?? {})}
 *         </pre>
 *       )}
 *     </section>
 *   )
 * }
 * ```
 *
 * @remarks
 * Input is a FLAT `Span[]` linked by `parentId` — do not pre-nest
 * children. `startTime`/`duration` are NUMBERS (not `Date`s or ISO
 * strings): convert timestamps to milliseconds relative to one origin
 * first. Must render inside `<I18nProvider>` / `<MoleculeProvider>`
 * (`useTranslation()` throws otherwise) with a ClassMap bond wired
 * (`setClassMap(classMap)` from `@molecule/app-ui`). It does NOT fetch
 * traces or show a span-detail panel — `onSpanClick(span)` hands you the
 * span to render your own.
 *
 * Duration labels assume time values are MILLISECONDS: `formatDurationLabel`
 * renders values below 1 as microseconds and 1000+ as seconds, so
 * seconds-unit spans get wrong axis/row labels even though bar layout itself
 * is unit-agnostic — feed ms (or divide labels yourself). Bar status colors
 * and the 12-hue service palette are hardcoded hex (theme-independent,
 * legible in light + dark). The label column is fixed at 240px; long names
 * ellipsize. Rows are keyboard-activatable when `onSpanClick` is set.
 * Aria/empty-state strings come from the companion
 * `@molecule/app-locales-trace-waterfall` bond.
 *
 * @module
 */

export * from './layout.js'
export * from './TraceWaterfall.js'
export * from './types.js'
