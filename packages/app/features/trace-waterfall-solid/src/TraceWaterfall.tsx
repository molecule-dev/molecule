import { type Component, createMemo, For, type JSX, Show } from 'solid-js'

import { useLocale, useT } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import {
  AXIS_TICK_COUNT,
  BAR_HEIGHT_PX,
  DEFAULT_BAR_COLOR,
  DEPTH_INDENT_PX,
  LABEL_COLUMN_PX,
  ROW_HEIGHT_PX,
  STATUS_COLOR,
} from './constants.js'
import { translateDuration } from './format.js'
import { layoutSpans, serviceColor } from './layout.js'
import type { Span, SpanRow, TraceWaterfallProps } from './types.js'

/** Props of {@link TimeAxis}. */
interface TimeAxisProps {
  /** The trace's total duration. */
  traceDuration: number
  /** Pixel width of the left-hand label column. */
  labelColumnWidth: number
  /** The translated total-duration label. */
  totalLabel: string
}

/**
 * Top time axis with evenly spaced ticks.
 *
 * @param props - Component props (see {@link TimeAxisProps}).
 * @returns The axis element.
 */
const TimeAxis: Component<TimeAxisProps> = (props) => {
  const cm = getClassMap()
  // Read in the ticks accessor, so the labels follow a locale switch.
  const t = useT()
  const activeLocale = useLocale()
  const ticks = (): { left: string; label: string }[] => {
    const out: { left: string; label: string }[] = []
    for (let i = 0; i < AXIS_TICK_COUNT; i++) {
      const fraction = i / (AXIS_TICK_COUNT - 1)
      out.push({
        left: `${fraction * 100}%`,
        label: translateDuration(fraction * props.traceDuration, activeLocale(), t),
      })
    }
    return out
  }
  return (
    <div
      class={cm.cn(cm.flex({ align: 'center' }), cm.textSize('xs'))}
      data-mol-id="trace-waterfall-axis"
    >
      <div style={{ width: `${props.labelColumnWidth}px`, 'flex-shrink': '0', opacity: '0.7' }}>
        {props.totalLabel}
      </div>
      <div style={{ position: 'relative', flex: '1 1 0%', height: '18px' }}>
        <For each={ticks()}>
          {(tick) => (
            <div
              style={{
                position: 'absolute',
                left: tick.left,
                top: '0px',
                transform: 'translateX(-50%)',
                opacity: '0.7',
                'white-space': 'nowrap',
              }}
              data-mol-id="trace-waterfall-axis-tick"
            >
              {tick.label}
            </div>
          )}
        </For>
      </div>
    </div>
  )
}

/** Props of {@link SpanRowView}. */
interface SpanRowProps {
  /** The layout row to render. */
  row: SpanRow
  /** Pixel width of the left-hand label column. */
  labelColumnWidth: number
  /** Whether this span is the selected one. */
  selected: boolean
  /** The optional row-selection callback. */
  onSpanClick?: (span: Span) => void
}

/**
 * A single rendered span row: indented label column + positioned bar.
 *
 * @param props - Component props (see {@link SpanRowProps}).
 * @returns The row element.
 */
const SpanRowView: Component<SpanRowProps> = (props) => {
  const cm = getClassMap()
  const t = useT()
  // Read in the accessors, so the badge label follows a locale switch.
  const activeLocale = useLocale()
  const span = (): Span => props.row.span
  const barColor = (): string => {
    const status = span().status
    return status ? STATUS_COLOR[status] : DEFAULT_BAR_COLOR
  }
  const tagColor = (): string | undefined => {
    const service = span().service
    return service ? serviceColor(service) : undefined
  }
  const interactive = (): boolean => Boolean(props.onSpanClick)
  // The badge and the `{{duration}}` of the row's aria label both name the same
  // duration, so both go through `translateDuration`: the number follows the
  // app's locale and a screen reader announces what the badge shows.
  const durationText = (): string => translateDuration(span().duration, activeLocale(), t)
  const ariaLabel = (): string =>
    t(
      'traceWaterfall.row.aria',
      {
        name: span().name,
        service: span().service ?? '',
        duration: durationText(),
      },
      {
        defaultValue: '{{service}} · {{name}} · {{duration}}',
      },
    )
  const handleKey = (ev: KeyboardEvent): void => {
    if (!props.onSpanClick) return
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault()
      props.onSpanClick(span())
    }
  }

  return (
    <div
      class={cm.cn(cm.flex({ align: 'center' }))}
      style={{ height: `${ROW_HEIGHT_PX}px` }}
      role="treeitem"
      aria-level={props.row.depth + 1}
      aria-selected={props.selected ? 'true' : 'false'}
      aria-label={ariaLabel()}
      tabindex={interactive() ? 0 : -1}
      onClick={() => props.onSpanClick?.(span())}
      onKeyDown={handleKey}
      data-mol-id="trace-waterfall-row"
      data-span-id={span().id}
    >
      <div
        class={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.textSize('xs'))}
        style={{
          width: `${props.labelColumnWidth}px`,
          'flex-shrink': '0',
          'padding-left': `${props.row.depth * DEPTH_INDENT_PX}px`,
          cursor: interactive() ? 'pointer' : 'default',
          overflow: 'hidden',
          'white-space': 'nowrap',
          'text-overflow': 'ellipsis',
        }}
      >
        <Show when={span().service}>
          <span
            data-mol-id="trace-waterfall-service-tag"
            style={{
              display: 'inline-block',
              padding: '0 6px',
              'border-radius': '4px',
              background: tagColor(),
              color: '#fff',
              'font-weight': '600',
              'font-size': '10px',
              'line-height': '14px',
              'flex-shrink': '0',
            }}
          >
            {span().service}
          </span>
        </Show>
        <span
          style={{ overflow: 'hidden', 'text-overflow': 'ellipsis' }}
          data-mol-id="trace-waterfall-name"
        >
          {span().name}
        </span>
      </div>
      <div
        style={{
          position: 'relative',
          flex: '1 1 0%',
          height: `${ROW_HEIGHT_PX}px`,
          cursor: interactive() ? 'pointer' : 'default',
        }}
      >
        <div
          data-mol-id="trace-waterfall-bar"
          style={{
            position: 'absolute',
            top: `${(ROW_HEIGHT_PX - BAR_HEIGHT_PX) / 2}px`,
            left: `${props.row.startFraction * 100}%`,
            width: `${Math.max(props.row.widthFraction * 100, 0.5)}%`,
            height: `${BAR_HEIGHT_PX}px`,
            background: barColor(),
            'border-radius': '2px',
          }}
        />
        <div
          data-mol-id="trace-waterfall-duration"
          style={{
            position: 'absolute',
            top: '0px',
            left: `calc(${props.row.startFraction * 100}% + ${Math.max(props.row.widthFraction * 100, 0.5)}% + 6px)`,
            height: `${ROW_HEIGHT_PX}px`,
            display: 'flex',
            'align-items': 'center',
            'font-size': '11px',
            opacity: '0.75',
            'white-space': 'nowrap',
            'pointer-events': 'none',
          }}
        >
          {durationText()}
        </div>
      </div>
    </div>
  )
}

/** Props of {@link EmptyFallback}. */
interface EmptyFallbackProps {
  /** The caller's empty-state node, when it supplied one. */
  emptyState?: JSX.Element
  /** Extra classes merged onto the default fallback. */
  className?: string
}

/**
 * What renders when the trace has no rows: the caller's `emptyState` node, or
 * the package's own "no spans" status line.
 *
 * @param props - Component props (see {@link EmptyFallbackProps}).
 * @returns The empty state.
 */
const EmptyFallback: Component<EmptyFallbackProps> = (props) => {
  const cm = getClassMap()
  const t = useT()
  return (
    <Show
      when={props.emptyState}
      fallback={
        <div
          class={cm.cn(cm.sp('p', 3), cm.textSize('sm'), props.className)}
          data-mol-id="trace-waterfall-empty"
          role="status"
        >
          {t('traceWaterfall.empty', undefined, { defaultValue: 'No spans to display.' })}
        </div>
      }
    >
      {props.emptyState}
    </Show>
  )
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
 * This is the Solid counterpart of `@molecule/app-trace-waterfall-react`:
 * the same props (React names) and the same DOM for the same input.
 *
 * @param props - Component props (see {@link TraceWaterfallProps}).
 * @returns The rendered waterfall.
 */
export const TraceWaterfall: Component<TraceWaterfallProps> = (props) => {
  const cm = getClassMap()
  const t = useT()
  const locale = useLocale()
  const layout = createMemo(() => layoutSpans(props.spans, props.rootSpanId))

  return (
    <Show
      when={layout().rows.length > 0}
      fallback={<EmptyFallback emptyState={props.emptyState} className={props.className} />}
    >
      <div
        class={cm.cn(cm.stack(1), props.className)}
        role="region"
        aria-label={t('traceWaterfall.aria.label', undefined, {
          defaultValue: 'Distributed trace waterfall',
        })}
        data-mol-id="trace-waterfall"
      >
        <TimeAxis
          traceDuration={layout().traceDuration}
          labelColumnWidth={LABEL_COLUMN_PX}
          totalLabel={t(
            'traceWaterfall.totalDuration',
            { duration: translateDuration(layout().traceDuration, locale(), t) },
            { defaultValue: 'Total: {{duration}}' },
          )}
        />
        <div role="tree" data-mol-id="trace-waterfall-rows">
          <For each={layout().rows}>
            {(row) => (
              <SpanRowView
                row={row}
                labelColumnWidth={LABEL_COLUMN_PX}
                selected={props.selectedSpanId === row.span.id}
                onSpanClick={props.onSpanClick}
              />
            )}
          </For>
        </div>
      </div>
    </Show>
  )
}
