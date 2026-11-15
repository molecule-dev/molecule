/**
 * Vue Apple-Health-style concentric SVG progress rings — single + triad.
 *
 * Vue counterpart of `@molecule/app-progress-rings-react`'s `ProgressRings` —
 * the same props (React names), the same ClassMap classes and the same DOM for
 * the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import type { ProgressRing } from './types.js'

/** Internal: one ring's geometry (radius + arc lengths). */
interface RingGeometry {
  radius: number
  circumference: number
  filledLength: number
}

/**
 * Compute geometry for a single ring at index `i`.
 *
 * Rings are nested inside-out — index 0 is the outermost. Each successive
 * ring sits one (strokeWidth + gap) inward.
 *
 * @param i - Ring index (0 = outermost).
 * @param size - Outer SVG diameter.
 * @param strokeWidth - Stroke thickness.
 * @param gap - Gap between rings.
 * @param ring - The ring data.
 * @returns Computed radius / circumference / filled-length for the ring.
 */
function computeGeometry(
  i: number,
  size: number,
  strokeWidth: number,
  gap: number,
  ring: ProgressRing,
): RingGeometry {
  const radius = size / 2 - strokeWidth / 2 - i * (strokeWidth + gap)
  const circumference = 2 * Math.PI * Math.max(radius, 0)
  const safeMax = ring.max > 0 ? ring.max : 1
  const ratio = Math.max(0, Math.min(1, ring.value / safeMax))
  const filledLength = circumference * ratio
  return { radius, circumference, filledLength }
}

/**
 * Apple-Health-style concentric SVG progress rings. Renders a single circular
 * ring when `rings.length === 1`, or a nested stack of rings (outermost first)
 * for 2+ entries. Pure SVG — no canvas, no chart-library dep. Layout resolves
 * via the wired ClassMap; ring colors come from props (typically resolved from
 * theme tokens by the caller).
 *
 * @param props - Component props (see {@link ProgressRingsProps}).
 * @returns The progress rings component.
 */
export const ProgressRings = defineComponent({
  name: 'ProgressRings',
  props: {
    rings: { type: Array as PropType<ProgressRing[]>, required: true },
    size: { type: Number as PropType<number> },
    strokeWidth: { type: Number as PropType<number> },
    gap: { type: Number as PropType<number> },
    cornerRadius: { type: String as PropType<'round' | 'butt'> },
    className: { type: String as PropType<string> },
    dataMolId: { type: String as PropType<string> },
    ariaLabel: { type: String as PropType<string> },
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()

    return (): VNode => {
      const size = props.size ?? 160
      const strokeWidth = props.strokeWidth ?? 12
      const gap = props.gap ?? 4
      const cornerRadius = props.cornerRadius ?? 'round'
      const center = size / 2
      const summary =
        props.ariaLabel ??
        t(
          'progressRings.summary',
          { count: props.rings.length },
          {
            defaultValue: 'Progress rings ({{count}} rings)',
          },
        )
      const groups: VNode[] = []
      props.rings.forEach((ring, i) => {
        const { radius, circumference, filledLength } = computeGeometry(
          i,
          size,
          strokeWidth,
          gap,
          ring,
        )
        if (radius <= 0) return
        const perRingLabel =
          ring.label ??
          t('progressRings.ring', { index: i + 1 }, { defaultValue: 'Ring {{index}}' })
        groups.push(
          h('g', { key: i, role: 'img', 'aria-label': perRingLabel }, [
            h('circle', {
              cx: center,
              cy: center,
              r: radius,
              fill: 'none',
              stroke: ring.color,
              'stroke-opacity': 0.18,
              'stroke-width': strokeWidth,
            }),
            h('circle', {
              cx: center,
              cy: center,
              r: radius,
              fill: 'none',
              stroke: ring.color,
              'stroke-width': strokeWidth,
              'stroke-linecap': cornerRadius,
              'stroke-dasharray': `${filledLength} ${circumference}`,
              transform: `rotate(-90 ${center} ${center})`,
            }),
          ]),
        )
      })

      return h(
        'svg',
        {
          class: cm.cn(props.className),
          'data-mol-id': props.dataMolId ?? 'progress-rings',
          role: 'img',
          'aria-label': summary,
          width: size,
          height: size,
          viewBox: `0 0 ${size} ${size}`,
        },
        groups,
      )
    }
  },
})
