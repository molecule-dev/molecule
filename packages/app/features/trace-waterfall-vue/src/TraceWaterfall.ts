/**
 * Vue distributed-trace span waterfall.
 *
 * Vue counterpart of `@molecule/app-trace-waterfall-react`'s `TraceWaterfall`
 * — the same props (React names), the same ClassMap tokens, inline styles and
 * DOM for the same input.
 *
 * @module
 */

import { computed, defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { useLocale, useT } from '@molecule/app-vue'

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
import type { Span, SpanRow } from './types.js'

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot: the
 * slot wins, and an absent pair contributes nothing.
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns The children to render.
 */
const slotOrProp = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): VNodeChild[] => {
  if (slot) return slot()
  return prop != null ? [prop] : []
}

/** The translation function `useT` returns. */
type Translator = ReturnType<typeof useT>

/**
 * Top time axis with evenly spaced ticks.
 *
 * @param cm - The class map.
 * @param traceDuration - The trace's total duration.
 * @param labelColumnWidth - Pixel width of the left-hand label column.
 * @param totalLabel - The translated total-duration label.
 * @param locale - The app's active locale.
 * @param t - The translation function.
 * @returns The axis element.
 */
function timeAxis(
  cm: UIClassMap,
  traceDuration: number,
  labelColumnWidth: number,
  totalLabel: string,
  locale: string,
  t: Translator,
): VNode {
  const ticks: { left: string; label: string }[] = []
  for (let i = 0; i < AXIS_TICK_COUNT; i++) {
    const fraction = i / (AXIS_TICK_COUNT - 1)
    ticks.push({
      left: `${fraction * 100}%`,
      label: translateDuration(fraction * traceDuration, locale, t),
    })
  }
  return h(
    'div',
    {
      class: cm.cn(cm.flex({ align: 'center' }), cm.textSize('xs')),
      'data-mol-id': 'trace-waterfall-axis',
    },
    [
      h('div', { style: { width: `${labelColumnWidth}px`, flexShrink: 0, opacity: 0.7 } }, [
        totalLabel,
      ]),
      h(
        'div',
        { style: { position: 'relative', flex: 1, height: '18px' } },
        ticks.map((tick) =>
          h(
            'div',
            {
              style: {
                position: 'absolute',
                left: tick.left,
                top: '0px',
                transform: 'translateX(-50%)',
                opacity: 0.7,
                whiteSpace: 'nowrap',
              },
              'data-mol-id': 'trace-waterfall-axis-tick',
            },
            [tick.label],
          ),
        ),
      ),
    ],
  )
}

/**
 * A single rendered span row: indented label column + positioned bar.
 *
 * @param cm - The class map.
 * @param t - The translation function.
 * @param row - The layout row to render.
 * @param labelColumnWidth - Pixel width of the left-hand label column.
 * @param selected - Whether this span is the selected one.
 * @param locale - The app's active locale.
 * @param onSpanClick - The optional row-selection callback.
 * @returns The row element.
 */
function spanRowView(
  cm: UIClassMap,
  t: Translator,
  row: SpanRow,
  labelColumnWidth: number,
  selected: boolean,
  locale: string,
  onSpanClick?: (span: Span) => void,
): VNode {
  const { span, depth, startFraction, widthFraction } = row
  const barColor = span.status ? STATUS_COLOR[span.status] : DEFAULT_BAR_COLOR
  const tagColor = span.service ? serviceColor(span.service) : undefined

  const handleClick = onSpanClick ? () => onSpanClick(span) : undefined
  const handleKey = onSpanClick
    ? (ev: KeyboardEvent) => {
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

  return h(
    'div',
    {
      class: cm.cn(cm.flex({ align: 'center' })),
      style: { height: `${ROW_HEIGHT_PX}px` },
      role: 'treeitem',
      'aria-level': depth + 1,
      'aria-selected': selected ? 'true' : 'false',
      'aria-label': ariaLabel,
      tabindex: interactive ? 0 : -1,
      onClick: handleClick,
      onKeydown: handleKey,
      'data-mol-id': 'trace-waterfall-row',
      'data-span-id': span.id,
    },
    [
      h(
        'div',
        {
          class: cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.textSize('xs')),
          style: {
            width: `${labelColumnWidth}px`,
            flexShrink: 0,
            paddingLeft: `${depth * DEPTH_INDENT_PX}px`,
            cursor: interactive ? 'pointer' : 'default',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          },
        },
        [
          span.service
            ? h(
                'span',
                {
                  'data-mol-id': 'trace-waterfall-service-tag',
                  style: {
                    display: 'inline-block',
                    padding: '0 6px',
                    borderRadius: '4px',
                    background: tagColor,
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '10px',
                    lineHeight: '14px',
                    flexShrink: 0,
                  },
                },
                [span.service],
              )
            : null,
          h(
            'span',
            {
              style: { overflow: 'hidden', textOverflow: 'ellipsis' },
              'data-mol-id': 'trace-waterfall-name',
            },
            [span.name],
          ),
        ],
      ),
      h(
        'div',
        {
          style: {
            position: 'relative',
            flex: 1,
            height: `${ROW_HEIGHT_PX}px`,
            cursor: interactive ? 'pointer' : 'default',
          },
        },
        [
          h('div', {
            'data-mol-id': 'trace-waterfall-bar',
            style: {
              position: 'absolute',
              top: `${(ROW_HEIGHT_PX - BAR_HEIGHT_PX) / 2}px`,
              left: `${startFraction * 100}%`,
              width: `${Math.max(widthFraction * 100, 0.5)}%`,
              height: `${BAR_HEIGHT_PX}px`,
              background: barColor,
              borderRadius: '2px',
            },
          }),
          h(
            'div',
            {
              'data-mol-id': 'trace-waterfall-duration',
              style: {
                position: 'absolute',
                top: '0px',
                left: `calc(${startFraction * 100}% + ${Math.max(widthFraction * 100, 0.5)}% + 6px)`,
                height: `${ROW_HEIGHT_PX}px`,
                display: 'flex',
                alignItems: 'center',
                fontSize: '11px',
                opacity: 0.75,
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
              },
            },
            [durationText],
          ),
        ],
      ),
    ],
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
 * @param props - Component props (see {@link TraceWaterfallProps}).
 * @returns The waterfall component.
 */
export const TraceWaterfall = defineComponent({
  name: 'TraceWaterfall',
  props: {
    spans: {
      type: Array as PropType<Span[]>,
      required: true,
    },
    rootSpanId: String,
    selectedSpanId: String,
    onSpanClick: Function as PropType<(span: Span) => void>,
    emptyState: null,
    className: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const t = useT()
    // Read in the render function through `.value`, so the tick and badge
    // labels follow a locale switch.
    const activeLocale = useLocale()
    const layout = computed(() => layoutSpans(props.spans, props.rootSpanId))

    return (): VNodeChild => {
      if (layout.value.rows.length === 0) {
        const empty = slotOrProp(slots.emptyState, props.emptyState)
        if (empty.length > 0) return empty
        return h(
          'div',
          {
            class: cm.cn(cm.sp('p', 3), cm.textSize('sm'), props.className),
            'data-mol-id': 'trace-waterfall-empty',
            role: 'status',
          },
          [t('traceWaterfall.empty', undefined, { defaultValue: 'No spans to display.' })],
        )
      }

      const totalLabel = t(
        'traceWaterfall.totalDuration',
        { duration: translateDuration(layout.value.traceDuration, activeLocale.value, t) },
        { defaultValue: 'Total: {{duration}}' },
      )
      const ariaLabel = t('traceWaterfall.aria.label', undefined, {
        defaultValue: 'Distributed trace waterfall',
      })

      return h(
        'div',
        {
          class: cm.cn(cm.stack(1 as const), props.className),
          role: 'region',
          'aria-label': ariaLabel,
          'data-mol-id': 'trace-waterfall',
        },
        [
          timeAxis(
            cm,
            layout.value.traceDuration,
            LABEL_COLUMN_PX,
            totalLabel,
            activeLocale.value,
            t,
          ),
          h(
            'div',
            { role: 'tree', 'data-mol-id': 'trace-waterfall-rows' },
            layout.value.rows.map((row) =>
              spanRowView(
                cm,
                t,
                row,
                LABEL_COLUMN_PX,
                props.selectedSpanId === row.span.id,
                activeLocale.value,
                props.onSpanClick,
              ),
            ),
          ),
        ],
      )
    }
  },
})
