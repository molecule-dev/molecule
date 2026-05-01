import type { Span, SpanLayout, SpanRow } from './types.js'

/**
 * Build a hierarchical, time-positioned layout for a flat list of spans.
 *
 * Behavior:
 * - Spans are linked by `parentId`. A span whose `parentId` is missing from
 *   the input (or undefined) is treated as a root.
 * - If `rootSpanId` is provided AND that id exists in the input, the
 *   layout is restricted to that span and its descendants. Otherwise every
 *   root contributes its own subtree.
 * - Children are sorted by `startTime` ascending (stable for equal times).
 * - `traceStart` / `traceEnd` are derived from the included spans only.
 * - `traceDuration` is clamped to `>= 1` so callers can safely divide.
 *
 * The output is intentionally framework-agnostic: callers (such as
 * `<TraceWaterfall>`) can render the rows however they like.
 *
 * @param spans - Flat list of spans, in any order.
 * @param rootSpanId - Optional id to use as the visible root.
 * @returns Layout rows, sorted depth-first, with normalized fractions.
 */
export function layoutSpans(spans: Span[], rootSpanId?: string): SpanLayout {
  const byId = new Map<string, Span>()
  for (const s of spans) byId.set(s.id, s)

  // Build child lists, sorted by start time.
  const childrenOf = new Map<string | undefined, Span[]>()
  for (const s of spans) {
    const parentKey = s.parentId !== undefined && byId.has(s.parentId) ? s.parentId : undefined
    const list = childrenOf.get(parentKey) ?? []
    list.push(s)
    childrenOf.set(parentKey, list)
  }
  for (const list of childrenOf.values()) {
    list.sort((a, b) => a.startTime - b.startTime)
  }

  // Determine the visible roots.
  let roots: Span[]
  if (rootSpanId !== undefined && byId.has(rootSpanId)) {
    roots = [byId.get(rootSpanId)!]
  } else {
    roots = childrenOf.get(undefined) ?? []
  }

  // Depth-first walk to produce ordered rows.
  const collected: { span: Span; depth: number }[] = []
  const visit = (span: Span, depth: number): void => {
    collected.push({ span, depth })
    const kids = childrenOf.get(span.id) ?? []
    for (const child of kids) visit(child, depth + 1)
  }
  for (const r of roots) visit(r, 0)

  if (collected.length === 0) {
    return { rows: [], traceStart: 0, traceEnd: 0, traceDuration: 1 }
  }

  // Compute absolute time bounds across the included spans.
  let traceStart = Number.POSITIVE_INFINITY
  let traceEnd = Number.NEGATIVE_INFINITY
  for (const { span } of collected) {
    if (span.startTime < traceStart) traceStart = span.startTime
    const end = span.startTime + Math.max(0, span.duration)
    if (end > traceEnd) traceEnd = end
  }
  const rawDuration = traceEnd - traceStart
  const traceDuration = rawDuration > 0 ? rawDuration : 1

  const rows: SpanRow[] = collected.map(({ span, depth }) => {
    const startFraction = (span.startTime - traceStart) / traceDuration
    const widthFraction = Math.max(0, span.duration) / traceDuration
    return { span, depth, startFraction, widthFraction }
  })

  return { rows, traceStart, traceEnd, traceDuration }
}

/**
 * Deterministically derive a hex color from a service name. Used for the
 * color tag next to each span row. Same input always yields the same color
 * across renders so a service is visually stable.
 *
 * @param service - Service / component label.
 * @returns A hex color string suitable for an inline `style.background`.
 */
export function serviceColor(service: string): string {
  let h = 0
  for (let i = 0; i < service.length; i++) {
    h = (h * 31 + service.charCodeAt(i)) >>> 0
  }
  // 12 distinct hues — picked for legibility on light + dark backgrounds.
  const palette = [
    '#3b82f6',
    '#8b5cf6',
    '#ec4899',
    '#f97316',
    '#eab308',
    '#22c55e',
    '#06b6d4',
    '#0ea5e9',
    '#ef4444',
    '#14b8a6',
    '#a855f7',
    '#f43f5e',
  ]
  return palette[h % palette.length]
}
