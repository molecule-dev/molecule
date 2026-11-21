/**
 * Vue tiny inline trend chart — line, bar, or dot variants.
 *
 * Vue counterpart of `@molecule/app-sparkline-react`'s `Sparkline` — the
 * same props (React names), the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

/**
 * Tiny inline trend chart — line, bar, or dot variants. Uses SVG with no
 * external library so it works inside cards, table cells, KPI tiles, etc.
 * without a chart bond. Same props, same DOM as
 * `@molecule/app-sparkline-react`'s `Sparkline`.
 *
 * @param props - Component props (see {@link SparklineProps}).
 * @returns The sparkline component.
 */
export const Sparkline = defineComponent({
  name: 'Sparkline',
  props: {
    values: { type: Array as PropType<number[]>, required: true },
    variant: { type: String as PropType<'line' | 'bar' | 'dot'>, default: undefined },
    width: { type: Number as PropType<number>, default: undefined },
    height: { type: Number as PropType<number>, default: undefined },
    color: { type: String as PropType<string>, default: undefined },
    ariaLabel: { type: String as PropType<string>, default: undefined },
    className: { type: String as PropType<string | undefined>, default: undefined },
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()

    return (): VNode | null => {
      const values = props.values
      if (values.length === 0) return null
      const variant = props.variant ?? 'line'
      const width = props.width ?? 80
      const height = props.height ?? 24
      const color = props.color ?? 'currentColor'
      const min = Math.min(...values)
      const max = Math.max(...values)
      const range = max - min || 1
      const stepX = values.length === 1 ? 0 : width / (values.length - 1)
      const y = (v: number): number => height - ((v - min) / range) * height
      const children: VNode[] = []
      if (variant === 'line') {
        children.push(
          h('polyline', {
            fill: 'none',
            stroke: color,
            'stroke-width': 1.5,
            points: values.map((v, i) => `${i * stepX},${y(v)}`).join(' '),
          }),
        )
      } else if (variant === 'bar') {
        const w = Math.max(2, width / values.length - 2)
        values.forEach((v, i) => {
          const barHeight = ((v - min) / range) * height
          children.push(
            h('rect', {
              x: i * (w + 2),
              y: height - barHeight,
              width: w,
              height: barHeight,
              fill: color,
            }),
          )
        })
      } else if (variant === 'dot') {
        values.forEach((v, i) => {
          children.push(h('circle', { cx: i * stepX, cy: y(v), r: 1.5, fill: color }))
        })
      }
      return h(
        'svg',
        {
          width,
          height,
          viewBox: `0 0 ${width} ${height}`,
          role: 'img',
          'aria-label':
            props.ariaLabel ??
            t('sparkline.aria.trendSparkline', undefined, { defaultValue: 'Trend sparkline' }),
          class: cm.cn(props.className),
        },
        children,
      )
    }
  },
})
