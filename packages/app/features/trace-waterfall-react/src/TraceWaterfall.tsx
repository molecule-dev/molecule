import { useMemo } from 'react'

import { useLocale, useTranslation } from '@molecule/app-react'
import { getClassMap, type KitKeyboardEvent } from '@molecule/app-ui'
import { Box, Text } from '@molecule/app-ui-react/elements'

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

/**
 * The unit a duration label names: microseconds (`< 1`), milliseconds
 * (`< 1000`) or seconds.
 */
export type DurationUnit = 'us' | 'ms' | 's'

/**
 * The translation function the duration label helpers need — the shape of the
 * `t` a framework binding's `useTranslation()` / `useT()` returns.
 */
export type DurationLabelTranslator = (
  key: string,
  values?: Record<string, string | number>,
  options?: { defaultValue?: string },
) => string

/** A duration split for translation: which unit its label names, and the number. */
export interface DurationParts {
  /** The unit the label names. */
  unit: DurationUnit
  /**
   * The duration rounded to the unit, as an `Intl.NumberFormat` string in
   * `locale` (no grouping, up to two decimals — exactly the digits the
   * English labels carry).
   */
  value: string
}

/** Number options that reproduce the English labels' digits in every locale. */
const DURATION_NUMBER_OPTIONS: Intl.NumberFormatOptions = {
  useGrouping: false,
  maximumFractionDigits: 2,
}

/**
 * Format the number of a duration label in a locale.
 *
 * @param value - The already-rounded duration in its unit.
 * @param locale - The locale to format in.
 * @returns The number as an `Intl.NumberFormat` string.
 */
function formatDurationNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, DURATION_NUMBER_OPTIONS).format(value)
}

/**
 * Split a duration value (in the same unit as `Span.startTime`) for
 * translation: the unit its label names — `< 1` → microseconds, `< 1000` →
 * ms, otherwise seconds — and the number in that unit, formatted in `locale`
 * so it follows a locale switch. Pair the result with
 * {@link translateDuration}, which renders it through `t()`.
 *
 * @param value - The numeric value to split.
 * @param locale - The locale to format the number in.
 * @returns The unit and the formatted number.
 */
export function formatDurationParts(value: number, locale: string): DurationParts {
  if (!Number.isFinite(value) || value < 0)
    return { unit: 'ms', value: formatDurationNumber(0, locale) }
  if (value < 1)
    return { unit: 'us', value: formatDurationNumber(Math.round(value * 1000), locale) }
  if (value < 1000)
    return { unit: 'ms', value: formatDurationNumber(Math.round(value * 100) / 100, locale) }
  return { unit: 's', value: formatDurationNumber(Math.round(value / 100) / 10, locale) }
}

/**
 * A duration label for the axis ticks and the row badges: the unit and the
 * number in the app's active locale go through `t()` as one string, so the
 * label follows a locale switch (and the pseudo-locale check sees it). The
 * keys are `traceWaterfall.duration.us` / `.ms` / `.s` in the
 * `@molecule/app-locales-trace-waterfall` bond.
 *
 * @param value - The numeric value to label.
 * @param locale - The app's active locale.
 * @param t - The translation function.
 * @returns The label in the active locale.
 */
export function translateDuration(
  value: number,
  locale: string,
  t: DurationLabelTranslator,
): string {
  const parts = formatDurationParts(value, locale)
  if (parts.unit === 'us')
    return t('traceWaterfall.duration.us', { value: parts.value }, { defaultValue: '{{value}}µs' })
  if (parts.unit === 'ms')
    return t('traceWaterfall.duration.ms', { value: parts.value }, { defaultValue: '{{value}}ms' })
  return t('traceWaterfall.duration.s', { value: parts.value }, { defaultValue: '{{value}}s' })
}

/** Public props for `<TraceWaterfall>`. */
export interface TraceWaterfallProps {
  /** Flat list of spans; tree is derived from `parentId` references. */
  spans: Span[]
  /** Optional root span id to focus the view on a single subtree. */
  rootSpanId?: string
  /** Optional id of the currently selected span; sets `aria-selected` on that row. */
  selectedSpanId?: string
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
 * model. Translations come from `@molecule/app-locales-trace-waterfall`.
 *
 * Used by api-testing-tool, error-tracker, log-viewer, and any other
 * developer tooling that consumes distributed-trace data.
 *
 * @param props - Component props.
 * @param props.spans - Flat list of spans.
 * @param props.rootSpanId - Optional focus span id.
 * @param props.selectedSpanId - Optional id of the selected span (`aria-selected`).
 * @param props.onSpanClick - Optional row-click callback.
 * @param props.emptyState - Optional fallback when `spans` is empty.
 * @param props.className - Extra classes for the root.
 * @returns The waterfall element tree.
 */
export function TraceWaterfall({
  spans,
  rootSpanId,
  selectedSpanId,
  onSpanClick,
  emptyState,
  className,
}: TraceWaterfallProps): React.ReactElement | null {
  const cm = getClassMap()
  const { t } = useTranslation()
  const locale = useLocale()

  const layout = useMemo(() => layoutSpans(spans, rootSpanId), [spans, rootSpanId])

  if (layout.rows.length === 0) {
    if (emptyState) return <>{emptyState}</>
    return (
      <Box
        as="div"
        className={cm.cn(cm.sp('p', 3), cm.textSize('sm'), className)}
        data-mol-id="trace-waterfall-empty"
        role="status"
      >
        {t('traceWaterfall.empty', undefined, { defaultValue: 'No spans to display.' })}
      </Box>
    )
  }

  const totalLabel = t(
    'traceWaterfall.totalDuration',
    { duration: translateDuration(layout.traceDuration, locale, t) },
    { defaultValue: 'Total: {{duration}}' },
  )

  const ariaLabel = t('traceWaterfall.aria.label', undefined, {
    defaultValue: 'Distributed trace waterfall',
  })

  return (
    <Box
      as="div"
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
      <Box as="div" role="tree" data-mol-id="trace-waterfall-rows">
        {layout.rows.map((row) => (
          <SpanRowView
            key={row.span.id}
            row={row}
            labelColumnWidth={LABEL_COLUMN_PX}
            selected={selectedSpanId === row.span.id}
            onSpanClick={onSpanClick}
            locale={locale}
            t={t}
          />
        ))}
      </Box>
    </Box>
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
  const { t } = useTranslation()
  const locale = useLocale()
  const ticks: { left: string; label: string }[] = []
  for (let i = 0; i < AXIS_TICK_COUNT; i++) {
    const fraction = i / (AXIS_TICK_COUNT - 1)
    ticks.push({
      left: `${fraction * 100}%`,
      label: translateDuration(fraction * traceDuration, locale, t),
    })
  }
  return (
    <Box
      as="div"
      className={cm.cn(cm.flex({ align: 'center' }), cm.textSize('xs'))}
      data-mol-id="trace-waterfall-axis"
    >
      <Box as="div" webStyle={{ width: labelColumnWidth, flexShrink: 0, opacity: 0.7 }}>
        {totalLabel}
      </Box>
      <Box as="div" webStyle={{ position: 'relative', flex: 1, height: 18 }}>
        {ticks.map((tick, i) => (
          <Box
            as="div"
            key={i}
            webStyle={{
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
          </Box>
        ))}
      </Box>
    </Box>
  )
}

/** A single rendered span row: indented label column + positioned bar. */
function SpanRowView({
  row,
  labelColumnWidth,
  selected,
  onSpanClick,
  locale,
  t,
}: {
  row: SpanRow
  labelColumnWidth: number
  selected: boolean
  onSpanClick?: (span: Span) => void
  locale: string
  t: ReturnType<typeof useTranslation>['t']
}): React.ReactElement {
  const cm = getClassMap()
  const { span, depth, startFraction, widthFraction } = row
  const barColor = span.status ? STATUS_COLOR[span.status] : DEFAULT_BAR_COLOR
  const tagColor = span.service ? serviceColor(span.service) : undefined

  const handleClick = onSpanClick ? () => onSpanClick(span) : undefined
  const handleKey = onSpanClick
    ? (ev: KitKeyboardEvent) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault()
          onSpanClick(span)
        }
      }
    : undefined

  const interactive = Boolean(onSpanClick)
  // The badge and the `{{duration}}` of the row's aria label both name the same
  // duration, so both go through `translateDuration`: the number follows the
  // app's locale and a screen reader announces what the badge shows.
  const durationText = translateDuration(span.duration, locale, t)
  const ariaLabel = t(
    'traceWaterfall.row.aria',
    {
      name: span.name,
      service: span.service ?? '',
      duration: durationText,
    },
    {
      defaultValue: '{{service}} · {{name}} · {{duration}}',
    },
  )

  return (
    <Box
      as="div"
      className={cm.cn(cm.flex({ align: 'center' }))}
      webStyle={{ height: ROW_HEIGHT_PX }}
      role="treeitem"
      aria-level={depth + 1}
      aria-selected={selected}
      aria-label={ariaLabel}
      tabIndex={interactive ? 0 : -1}
      onClick={handleClick}
      onKeyDown={handleKey}
      data-mol-id="trace-waterfall-row"
      data-span-id={span.id}
    >
      <Box
        as="div"
        className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.textSize('xs'))}
        webStyle={{
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
          <Text
            as="span"
            data-mol-id="trace-waterfall-service-tag"
            webStyle={{
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
          </Text>
        ) : null}
        <Text
          as="span"
          webStyle={{ overflow: 'hidden', textOverflow: 'ellipsis' }}
          data-mol-id="trace-waterfall-name"
        >
          {span.name}
        </Text>
      </Box>
      <Box
        as="div"
        webStyle={{
          position: 'relative',
          flex: 1,
          height: ROW_HEIGHT_PX,
          cursor: interactive ? 'pointer' : 'default',
        }}
      >
        <Box
          as="div"
          data-mol-id="trace-waterfall-bar"
          webStyle={{
            position: 'absolute',
            top: (ROW_HEIGHT_PX - BAR_HEIGHT_PX) / 2,
            left: `${startFraction * 100}%`,
            width: `${Math.max(widthFraction * 100, 0.5)}%`,
            height: BAR_HEIGHT_PX,
            background: barColor,
            borderRadius: 2,
          }}
        />
        <Box
          as="div"
          data-mol-id="trace-waterfall-duration"
          webStyle={{
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
          {durationText}
        </Box>
      </Box>
    </Box>
  )
}
