import { useMemo } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { layoutSpans, serviceColor } from './layout.js'
import type { Span, SpanRow, SpanStatus } from './types.js'

/** Bar fill color per status. */
const STATUS_COLOR: Record<SpanStatus, string> = {
  ok: '#22c55e',
  error: '#ef4444',
  pending: '#94a3b8',
}

/** Default bar color when no status is supplied. */
const DEFAULT_BAR_COLOR = '#3b82f6'

/** Number of tick marks rendered along the time axis. */
const AXIS_TICK_COUNT = 5

/** Pixels of horizontal indentation per parent depth level. */
const DEPTH_INDENT_PX = 16

/** Pixel height of each span row (label + bar). */
const ROW_HEIGHT_PX = 28

/** Pixel height of a rendered span bar. */
const BAR_HEIGHT_PX = 12

/** Width (in pixels) of the left-hand label column. */
const LABEL_COLUMN_PX = 240

/**
 * Format a duration value (in the same unit as `Span.startTime`) as a
 * short, human-readable string: `< 1` → microseconds, `< 1000` → ms,
 * otherwise seconds with one decimal.
 *
 * @param value - The numeric value to format.
 * @returns A short label string.
 */
export function formatDurationLabel(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '0ms'
  if (value < 1) return `${Math.round(value * 1000)}µs`
  if (value < 1000) return `${Math.round(value * 100) / 100}ms`
  return `${Math.round(value / 100) / 10}s`
}

/** Public props for `<TraceWaterfall>`. */
export interface TraceWaterfallProps {
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

/**
 * Datadog/Jaeger-style distributed-trace waterfall. Renders each span as
 * a horizontal bar positioned by `startTime`, scaled to total trace
 * duration, indented by parent depth. A time axis is rendered along the
 * top with `AXIS_TICK_COUNT` evenly spaced ticks. Service name is shown
 * as a colored tag next to the operation name; bar color encodes status.
 *
 * Styling is fully ClassMap-driven for layout. Only color attributes
 * (status colors, service-tag colors, bar fill) and pixel-perfect axis
 * geometry use inline `style` — these are properties ClassMap does not
 * model. Translations come from `@molecule/app-locales-trace-waterfall-react`.
 *
 * Used by api-testing-tool, error-tracker, log-viewer, and any other
 * developer tooling that consumes distributed-trace data.
 *
 * @param props - Component props.
 * @param props.spans - Flat list of spans.
 * @param props.rootSpanId - Optional focus span id.
 * @param props.onSpanClick - Optional row-click callback.
 * @param props.emptyState - Optional fallback when `spans` is empty.
 * @param props.className - Extra classes for the root.
 * @returns The waterfall element tree.
 */
export function TraceWaterfall({
  spans,
  rootSpanId,
  onSpanClick,
  emptyState,
  className,
}: TraceWaterfallProps): React.ReactElement | null {
  const cm = getClassMap()
  const { t } = useTranslation()

  const layout = useMemo(() => layoutSpans(spans, rootSpanId), [spans, rootSpanId])

  if (layout.rows.length === 0) {
    if (emptyState) return <>{emptyState}</>
    return (
      <div
        className={cm.cn(cm.sp('p', 3), cm.textSize('sm'), className)}
        data-mol-id="trace-waterfall-empty"
        role="status"
      >
        {t('traceWaterfall.empty', undefined, { defaultValue: 'No spans to display.' })}
      </div>
    )
  }

  const totalLabel = t(
    'traceWaterfall.totalDuration',
    { duration: formatDurationLabel(layout.traceDuration) },
    { defaultValue: 'Total: {{duration}}' },
  )

  const ariaLabel = t('traceWaterfall.aria.label', undefined, {
    defaultValue: 'Distributed trace waterfall',
  })

  return (
    <div
      className={cm.cn(cm.stack(1 as const), className)}
      role="region"
      aria-label={ariaLabel}
      data-mol-id="trace-waterfall"
    >
      <TimeAxis
        traceDuration={layout.traceDuration}
        labelColumnWidth={LABEL_COLUMN_PX}
        totalLabel={totalLabel}
      />
      <div role="tree" data-mol-id="trace-waterfall-rows">
        {layout.rows.map((row) => (
          <SpanRowView
            key={row.span.id}
            row={row}
            labelColumnWidth={LABEL_COLUMN_PX}
            onSpanClick={onSpanClick}
            t={t}
          />
        ))}
      </div>
    </div>
  )
}

/** Top time axis with evenly spaced ticks. */
function TimeAxis({
  traceDuration,
  labelColumnWidth,
  totalLabel,
}: {
  traceDuration: number
  labelColumnWidth: number
  totalLabel: string
}): React.ReactElement {
  const cm = getClassMap()
  const ticks: { left: string; label: string }[] = []
  for (let i = 0; i < AXIS_TICK_COUNT; i++) {
    const fraction = i / (AXIS_TICK_COUNT - 1)
    ticks.push({
      left: `${fraction * 100}%`,
      label: formatDurationLabel(fraction * traceDuration),
    })
  }
  return (
    <div
      className={cm.cn(cm.flex({ align: 'center' }), cm.textSize('xs'))}
      data-mol-id="trace-waterfall-axis"
    >
      <div style={{ width: labelColumnWidth, flexShrink: 0, opacity: 0.7 }}>{totalLabel}</div>
      <div style={{ position: 'relative', flex: 1, height: 18 }}>
        {ticks.map((tick, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: tick.left,
              top: 0,
              transform: 'translateX(-50%)',
              opacity: 0.7,
              whiteSpace: 'nowrap',
            }}
            data-mol-id="trace-waterfall-axis-tick"
          >
            {tick.label}
          </div>
        ))}
      </div>
    </div>
  )
}

/** A single rendered span row: indented label column + positioned bar. */
function SpanRowView({
  row,
  labelColumnWidth,
  onSpanClick,
  t,
}: {
  row: SpanRow
  labelColumnWidth: number
  onSpanClick?: (span: Span) => void
  t: ReturnType<typeof useTranslation>['t']
}): React.ReactElement {
  const cm = getClassMap()
  const { span, depth, startFraction, widthFraction } = row
  const barColor = span.status ? STATUS_COLOR[span.status] : DEFAULT_BAR_COLOR
  const tagColor = span.service ? serviceColor(span.service) : undefined

  const handleClick = onSpanClick ? () => onSpanClick(span) : undefined
  const handleKey = onSpanClick
    ? (ev: React.KeyboardEvent<HTMLDivElement>) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault()
          onSpanClick(span)
        }
      }
    : undefined

  const interactive = Boolean(onSpanClick)
  const durationLabel = formatDurationLabel(span.duration)
  const ariaLabel = t(
    'traceWaterfall.row.aria',
    {
      name: span.name,
      service: span.service ?? '',
      duration: durationLabel,
    },
    {
      defaultValue: span.service
        ? '{{service}} · {{name}} · {{duration}}'
        : '{{name}} · {{duration}}',
    },
  )

  return (
    <div
      className={cm.cn(cm.flex({ align: 'center' }))}
      style={{ height: ROW_HEIGHT_PX }}
      role="treeitem"
      aria-level={depth + 1}
      aria-label={ariaLabel}
      tabIndex={interactive ? 0 : -1}
      onClick={handleClick}
      onKeyDown={handleKey}
      data-mol-id="trace-waterfall-row"
      data-span-id={span.id}
    >
      <div
        className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.textSize('xs'))}
        style={{
          width: labelColumnWidth,
          flexShrink: 0,
          paddingLeft: depth * DEPTH_INDENT_PX,
          cursor: interactive ? 'pointer' : 'default',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
        }}
      >
        {span.service ? (
          <span
            data-mol-id="trace-waterfall-service-tag"
            style={{
              display: 'inline-block',
              padding: '0 6px',
              borderRadius: 4,
              background: tagColor,
              color: '#fff',
              fontWeight: 600,
              fontSize: 10,
              lineHeight: '14px',
              flexShrink: 0,
            }}
          >
            {span.service}
          </span>
        ) : null}
        <span
          style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}
          data-mol-id="trace-waterfall-name"
        >
          {span.name}
        </span>
      </div>
      <div
        style={{
          position: 'relative',
          flex: 1,
          height: ROW_HEIGHT_PX,
          cursor: interactive ? 'pointer' : 'default',
        }}
      >
        <div
          data-mol-id="trace-waterfall-bar"
          style={{
            position: 'absolute',
            top: (ROW_HEIGHT_PX - BAR_HEIGHT_PX) / 2,
            left: `${startFraction * 100}%`,
            width: `${Math.max(widthFraction * 100, 0.5)}%`,
            height: BAR_HEIGHT_PX,
            background: barColor,
            borderRadius: 2,
          }}
        />
        <div
          data-mol-id="trace-waterfall-duration"
          style={{
            position: 'absolute',
            top: 0,
            left: `calc(${startFraction * 100}% + ${Math.max(widthFraction * 100, 0.5)}% + 6px)`,
            height: ROW_HEIGHT_PX,
            display: 'flex',
            alignItems: 'center',
            fontSize: 11,
            opacity: 0.75,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          {durationLabel}
        </div>
      </div>
    </div>
  )
}
