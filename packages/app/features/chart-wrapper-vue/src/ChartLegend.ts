/**
 * Vue `ChartLegend` — the Vue counterpart of
 * `@molecule/app-chart-wrapper-react`'s `ChartLegend`: the same props (React
 * names), the same ClassMap tokens and the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, toRaw, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'

import type { ChartLegendItem, ChartLegendProps } from './types.js'

/**
 * Resolves a node value that may be a node, an array of nodes or plain text
 * into the children list Vue renders.
 *
 * @param value - The item's label or value.
 * @returns The children to render.
 */
const nodeChildren = (value: VNodeChild | undefined): VNodeChild[] => {
  if (value == null) return []
  const raw = toRaw(value)
  return Array.isArray(raw) ? raw : [raw]
}

/**
 * Chart legend — swatch + label (+ optional value) per series. When
 * `onToggle` is provided, items become buttons that toggle series visibility.
 *
 * @param props - Component props (see {@link ChartLegendProps}).
 * @returns The chart legend component.
 */
export const ChartLegend = defineComponent({
  name: 'ChartLegend',
  props: {
    items: {
      type: Array as PropType<ChartLegendItem[]>,
      required: true,
    },
    onToggle: Function as PropType<ChartLegendProps['onToggle']>,
    layout: {
      type: String as PropType<'horizontal' | 'vertical'>,
      default: 'horizontal',
    },
    className: String,
  },
  setup(props) {
    const cm = getClassMap()

    return (): VNode =>
      h(
        'div',
        {
          class: cm.cn(
            cm.flex({
              direction: props.layout === 'vertical' ? 'col' : 'row',
              align: 'center',
              gap: 'md',
              wrap: 'wrap',
            }),
            props.className,
          ),
        },
        props.items.map((it) => {
          const content = h('span', { class: cm.flex({ align: 'center', gap: 'xs' }) }, [
            h('span', {
              'aria-hidden': 'true',
              style: {
                display: 'inline-block',
                width: '10px',
                height: '10px',
                borderRadius: '2px',
                background: it.color,
                opacity: it.hidden ? 0.3 : 1,
              },
            }),
            h(
              'span',
              {
                class: cm.cn(cm.textSize('sm'), it.hidden ? cm.textSize('sm') : undefined),
                style: it.hidden ? { opacity: 0.5 } : undefined,
              },
              nodeChildren(it.label),
            ),
            ...(it.value !== undefined
              ? [h('span', { class: cm.textSize('sm') }, nodeChildren(it.value))]
              : []),
          ])
          if (!props.onToggle) return h('span', { key: it.id }, [content])
          return h(
            'button',
            {
              key: it.id,
              type: 'button',
              onClick: () => props.onToggle?.(it.id),
              'aria-pressed': String(!it.hidden),
            },
            [content],
          )
        }),
      )
  },
})
