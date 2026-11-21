/**
 * Vue current-conditions hero card: gradient background, glass condition pill,
 * optional alert badge, hi/lo chip, and a 24h temperature sparkline rendered
 * from a trace.
 *
 * Vue counterpart of `@molecule/app-weather-card-react`'s `WeatherCard` — the
 * same props (React names), the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'

import type { WeatherAlertLevel, WeatherTracePoint } from './types.js'

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot: the
 * prop when given, otherwise the slot, otherwise nothing. React renders a
 * falsy node (`null`, `undefined`, `false`) as nothing.
 *
 * @param value - The prop's value, when the caller passed the prop.
 * @param slot - The same-named slot's render function, when provided.
 * @returns The children to render.
 */
const nodeOrSlot = (value: VNodeChild, slot: (() => VNodeChild[]) | undefined): VNodeChild[] => {
  if (value !== undefined && value !== null && value !== false) return [value]
  if (slot) return slot()
  return []
}

/** The sparkline's fixed DECORATIVE path, used when the trace is absent or too short. */
const FALLBACK = {
  fill: 'M0,68 Q40,52 80,46 T160,38 T240,55 T320,28 T400,42 L400,100 L0,100 Z',
  stroke: 'M0,68 Q40,52 80,46 T160,38 T240,55 T320,28 T400,42',
}

/**
 * Computes SVG fill and stroke path data for the 24h temperature sparkline.
 *
 * @param trace - The trace, when the caller supplied one.
 * @returns The area `fill` path and the line `stroke` path.
 */
function buildSparkline(trace: ReadonlyArray<WeatherTracePoint> | undefined): {
  fill: string
  stroke: string
} {
  if (!trace || trace.length < 2) return FALLBACK
  const W = 400
  const H = 100
  const values = trace.map((p) => p.temperature)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W
    const y = H - ((v - min) / range) * (H * 0.85) - H * 0.1
    return [x, y] as const
  })
  const stroke = pts
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ')
  const fill = `${stroke} L${W},${H} L0,${H} Z`
  return { fill, stroke }
}

/**
 * Atmospheric current-conditions hero.
 *
 * Layout: `[eyebrow? locationName region? alert?] [temperature condition?]
 * [feelsLike? highLow? updated?] [24h sparkline]`. All visual styling routes
 * through ClassMap tokens so the bonded styling layer controls the visual
 * treatment; the temperature's type scale and the glyph fill are inline,
 * exactly as React writes them.
 *
 * @param props - Component props (see {@link WeatherCardProps}).
 * @returns The weather card component.
 */
export const WeatherCard = defineComponent({
  name: 'WeatherCard',
  props: {
    locationName: { type: String, required: true },
    region: { type: String as PropType<string | null | undefined>, default: undefined },
    temperature: { type: Number, required: true },
    feelsLike: { type: Number as PropType<number | null | undefined>, default: undefined },
    high: { type: Number as PropType<number | null | undefined>, default: undefined },
    low: { type: Number as PropType<number | null | undefined>, default: undefined },
    condition: { type: String as PropType<string | null | undefined>, default: undefined },
    conditionIcon: { type: String, default: 'partly_cloudy_day' },
    alertLevel: {
      type: String as PropType<WeatherAlertLevel | null | undefined>,
      default: undefined,
    },
    // Node-valued props: declared with `null` (any runtime type, no
    // validation — a VNode, a string, or `null` to hide).
    alertLabel: null,
    updatedLabel: null,
    unit: { type: String, default: '°F' },
    eyebrow: null,
    trace: {
      type: Array as PropType<ReadonlyArray<WeatherTracePoint> | undefined>,
      default: undefined,
    },
    feelsLikeLabel: null,
    highLowLabel: null,
    className: { type: String, default: undefined },
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode => {
      const sparkline = buildSparkline(props.trace)
      const alertTone =
        props.alertLevel === 'watch'
          ? cm.weatherCardAlertWatch
          : props.alertLevel === 'warning'
            ? cm.weatherCardAlertWarning
            : cm.weatherCardAlertEmergency
      /**
       * The badge's content: React renders `alertLabel ?? alertLevel`, so a
       * supplied label wins and the level's own name is the fallback.
       *
       * @returns The children to render inside the badge.
       */
      const alertContent = (): VNodeChild[] => {
        if (props.alertLabel !== undefined && props.alertLabel !== null)
          return [props.alertLabel as VNodeChild]
        if (slots.alertLabel) return slots.alertLabel()
        return [props.alertLevel as string]
      }

      return h(
        'div',
        {
          class: cm.cn(
            cm.flex({ direction: 'col', justify: 'between' }),
            cm.sp('p', 10),
            cm.weatherCardHero,
            props.className,
          ),
        },
        [
          h('div', { class: cm.cn(cm.weatherCardContent) }, [
            h(
              'div',
              { class: cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'md' })) },
              [
                h('div', {}, [
                  ...(nodeOrSlot(props.eyebrow, slots.eyebrow).length > 0
                    ? [
                        h(
                          'p',
                          {
                            class: cm.cn(
                              cm.fontWeight('bold'),
                              cm.textSize('xs'),
                              cm.sp('mb', 1),
                              cm.weatherCardEyebrow,
                            ),
                          },
                          nodeOrSlot(props.eyebrow, slots.eyebrow),
                        ),
                      ]
                    : []),
                  h(
                    'h2',
                    {
                      class: cm.cn(
                        cm.textSize('2xl'),
                        cm.fontWeight('semibold'),
                        cm.weatherCardLocation,
                      ),
                    },
                    props.locationName,
                  ),
                  ...(props.region
                    ? [
                        h(
                          'p',
                          { class: cm.cn(cm.textSize('xs'), cm.sp('mt', 1), cm.weatherCardRegion) },
                          props.region,
                        ),
                      ]
                    : []),
                ]),
                ...(props.alertLevel
                  ? [
                      h(
                        'span',
                        {
                          class: cm.cn(
                            cm.flex({ align: 'center', gap: 'xs' }),
                            cm.sp('px', 3),
                            cm.sp('py', 1),
                            cm.roundedFull,
                            cm.fontWeight('bold'),
                            cm.weatherCardAlertBadge,
                            alertTone,
                          ),
                        },
                        [
                          h(
                            'span',
                            {
                              class: cm.cn(cm.iconGlyphFont, cm.textSize('sm')),
                              'aria-hidden': 'true',
                            },
                            'warning',
                          ),
                          ...alertContent(),
                        ],
                      ),
                    ]
                  : []),
              ],
            ),
            h('div', { class: cm.cn(cm.flex({ align: 'baseline', gap: 'lg' }), cm.sp('mt', 8)) }, [
              h(
                'span',
                {
                  class: cm.cn(cm.weatherCardTemperature),
                  style: {
                    fontSize: '4.5rem',
                    fontWeight: 200,
                    letterSpacing: '-0.03em',
                    lineHeight: 1,
                  },
                },
                [String(Math.round(props.temperature)), props.unit],
              ),
              h(
                'div',
                {
                  class: cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    cm.roundedFull,
                    cm.weatherCardConditionPill,
                  ),
                },
                [
                  h(
                    'span',
                    {
                      class: cm.cn(cm.iconGlyphFont, cm.textSize('2xl')),
                      style: { fontVariationSettings: "'FILL' 1" },
                      'aria-hidden': 'true',
                    },
                    props.conditionIcon,
                  ),
                  ...(props.condition
                    ? [
                        h(
                          'span',
                          { class: cm.cn(cm.fontWeight('semibold'), cm.textSize('sm')) },
                          props.condition,
                        ),
                      ]
                    : []),
                ],
              ),
            ]),
            h(
              'div',
              {
                class: cm.cn(cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }), cm.sp('mt', 4)),
              },
              [
                ...(nodeOrSlot(props.feelsLikeLabel, slots.feelsLikeLabel).length > 0
                  ? [
                      h(
                        'span',
                        {
                          class: cm.cn(
                            cm.textSize('sm'),
                            cm.fontWeight('medium'),
                            cm.weatherCardFeelsLike,
                          ),
                        },
                        nodeOrSlot(props.feelsLikeLabel, slots.feelsLikeLabel),
                      ),
                    ]
                  : []),
                ...(nodeOrSlot(props.highLowLabel, slots.highLowLabel).length > 0
                  ? [
                      h(
                        'span',
                        {
                          class: cm.cn(
                            cm.flex({ align: 'center', gap: 'xs' }),
                            cm.sp('px', 3),
                            cm.sp('py', 1),
                            cm.roundedFull,
                            cm.textSize('xs'),
                            cm.fontWeight('bold'),
                            cm.weatherCardHighLowChip,
                          ),
                        },
                        nodeOrSlot(props.highLowLabel, slots.highLowLabel),
                      ),
                    ]
                  : []),
                ...(nodeOrSlot(props.updatedLabel, slots.updatedLabel).length > 0
                  ? [
                      h(
                        'span',
                        { class: cm.cn(cm.textSize('xs'), cm.weatherCardUpdated) },
                        nodeOrSlot(props.updatedLabel, slots.updatedLabel),
                      ),
                    ]
                  : []),
              ],
            ),
          ]),
          h(
            'div',
            {
              class: cm.cn(cm.sp('mt', 10), cm.h(24), cm.w('full'), cm.weatherCardContent),
            },
            [
              h(
                'svg',
                {
                  class: cm.cn(cm.w('full'), cm.h('full')),
                  viewBox: '0 0 400 100',
                  preserveAspectRatio: 'none',
                  'aria-hidden': 'true',
                },
                [
                  h('path', { d: sparkline.fill, fill: 'white', opacity: '0.25' }),
                  h('path', {
                    d: sparkline.stroke,
                    fill: 'none',
                    stroke: 'white',
                    'stroke-width': '2.5',
                    'stroke-linecap': 'round',
                  }),
                ],
              ),
            ],
          ),
          h('div', { class: cm.cn(cm.weatherCardGlowLarge), 'aria-hidden': 'true' }),
          h('div', { class: cm.cn(cm.weatherCardGlowSmall), 'aria-hidden': 'true' }),
        ],
      )
    }
  },
})
