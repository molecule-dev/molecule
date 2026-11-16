/**
 * Vue `ChartCard` — the Vue counterpart of
 * `@molecule/app-chart-wrapper-react`'s `ChartCard`: the same props (React
 * names), the same ClassMap tokens and the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, toRaw, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Card } from '@molecule/app-ui-vue'

import type { ChartCardProps } from './types.js'

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
  if (prop == null) return []
  // A node passed through reactive state reads as a proxy; Vue writes `el`
  // onto every VNode it mounts, which would re-trigger the reading render.
  const value = toRaw(prop)
  return Array.isArray(value) ? value : [value]
}

/**
 * Whether React would render a node prop: `description && …` renders nothing
 * for `null`, `undefined`, `false` and the empty string, and everything else.
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns True when the region renders.
 */
const renders = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): boolean => (slot ? true : prop != null && prop !== false && prop !== '')

/**
 * Uniform chrome around a chart rendering — header + actions + optional
 * summary strip + chart body + optional footer.
 *
 * The chart library itself comes from the `@molecule/app-charts` bond; this
 * package only provides the surrounding container.
 *
 * @param props - Component props (see {@link ChartCardProps}).
 * @returns The chart card component.
 */
export const ChartCard = defineComponent({
  name: 'ChartCard',
  props: {
    title: null,
    description: null,
    actions: null,
    summary: null,
    footer: null,
    minChartHeight: {
      type: Number as PropType<ChartCardProps['minChartHeight']>,
      default: 240,
    },
    className: String,
    dataMolId: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode =>
      h(
        Card,
        { className: props.className, 'data-mol-id': props.dataMolId },
        {
          default: () => [
            h('div', { class: cm.stack(4) }, [
              h('header', { class: cm.flex({ justify: 'between', align: 'start', gap: 'sm' }) }, [
                h('div', { class: cm.stack(1) }, [
                  h(
                    'h3',
                    { class: cm.cn(cm.textSize('base'), cm.fontWeight('semibold')) },
                    slotOrProp(slots.title, props.title),
                  ),
                  ...(renders(slots.description, props.description)
                    ? [
                        h(
                          'p',
                          { class: cm.textSize('sm') },
                          slotOrProp(slots.description, props.description),
                        ),
                      ]
                    : []),
                ]),
                ...(renders(slots.actions, props.actions)
                  ? [
                      h(
                        'div',
                        { class: cm.flex({ align: 'center', gap: 'sm' }) },
                        slotOrProp(slots.actions, props.actions),
                      ),
                    ]
                  : []),
              ]),
              ...(renders(slots.summary, props.summary)
                ? [
                    h(
                      'div',
                      { class: cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }) },
                      slotOrProp(slots.summary, props.summary),
                    ),
                  ]
                : []),
              h(
                'div',
                { style: { minHeight: `${props.minChartHeight}px` } },
                slotOrProp(slots.default, null),
              ),
              ...(renders(slots.footer, props.footer)
                ? [h('div', null, slotOrProp(slots.footer, props.footer))]
                : []),
            ]),
          ],
        },
      )
  },
})
