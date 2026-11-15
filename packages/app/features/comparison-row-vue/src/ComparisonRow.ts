/**
 * Vue period-over-period stat comparison row — current value, optional
 * previous value, and a coloured delta% chip.
 *
 * Vue counterpart of `@molecule/app-comparison-row-react`'s `ComparisonRow` —
 * the same props (React names), the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'

const ARROW = (n: number): string => (n > 0 ? '▲' : n < 0 ? '▼' : '–')
const COLOR = (n: number): string => (n > 0 ? '#22c55e' : n < 0 ? '#ef4444' : '#94a3b8')

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

/**
 * Period-over-period stat comparison row — current value, optional previous
 * value, and a coloured delta% chip. Used in dashboards, report summaries,
 * finance overviews.
 *
 * @param props - Component props (see {@link ComparisonRowProps}).
 * @returns The comparison row component.
 */
export const ComparisonRow = defineComponent({
  name: 'ComparisonRow',
  props: {
    label: null,
    current: null,
    previous: null,
    deltaPct: { type: Number, default: undefined },
    formatDelta: {
      type: Function as PropType<(deltaPct: number) => VNodeChild>,
      default: undefined,
    },
    periodLabel: null,
    className: { type: String, default: undefined },
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode => {
      const deltaPct = props.deltaPct
      return h(
        'div',
        {
          class: cm.cn(
            cm.flex({ align: 'baseline', justify: 'between', gap: 'md' }),
            props.className,
          ),
        },
        [
          h('div', { class: cm.stack(0) }, [
            h(
              'span',
              { class: cm.cn(cm.textSize('xs'), cm.fontWeight('semibold')) },
              slotOrProp(slots.label, props.label),
            ),
            // React's `{periodLabel && …}`: a falsy label renders nothing.
            ...(props.periodLabel
              ? [
                  h(
                    'span',
                    { class: cm.textSize('xs') },
                    slotOrProp(slots.periodLabel, props.periodLabel),
                  ),
                ]
              : []),
          ]),
          h('div', { class: cm.flex({ align: 'baseline', gap: 'sm' }) }, [
            h(
              'span',
              { class: cm.cn(cm.textSize('lg'), cm.fontWeight('bold')) },
              slotOrProp(slots.current, props.current),
            ),
            ...(props.previous !== undefined
              ? [
                  h(
                    'span',
                    {
                      class: cm.cn(cm.textSize('xs')),
                      style: { textDecoration: 'line-through', opacity: 0.6 },
                    },
                    slotOrProp(slots.previous, props.previous),
                  ),
                ]
              : []),
            ...(deltaPct !== undefined
              ? [
                  h(
                    'span',
                    {
                      class: cm.cn(cm.textSize('xs'), cm.fontWeight('semibold')),
                      style: { color: COLOR(deltaPct) },
                    },
                    props.formatDelta
                      ? [props.formatDelta(deltaPct)]
                      : [`${ARROW(deltaPct)} ${Math.abs(deltaPct).toFixed(1)}%`],
                  ),
                ]
              : []),
          ]),
        ],
      )
    }
  },
})
