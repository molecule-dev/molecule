/**
 * Vue financial ticker row: symbol + price + change% + optional icon,
 * sparkline and meta.
 *
 * Vue counterpart of `@molecule/app-ticker-row-react`'s `TickerRow` — the
 * same props (React names), the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'

const POSITIVE_COLOR = '#22c55e'
const NEGATIVE_COLOR = '#ef4444'

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
 * Financial ticker row — symbol + price + change% + optional sparkline.
 * Use for crypto trackers, stock watchlists, market dashboards. `changePct`
 * drives the ▲/▼/– direction and a FIXED green/red hex color applied inline;
 * `price` and `meta` are opaque display nodes — the app owns formatting. With
 * `onClick` the row is a clickable div WITHOUT button semantics — wrap it in
 * your own button/link where keyboard access matters.
 *
 * @param props - Component props (see {@link TickerRowProps}).
 * @returns The ticker row component.
 */
export const TickerRow = defineComponent({
  name: 'TickerRow',
  props: {
    symbol: null,
    name: null,
    icon: null,
    price: null,
    changePct: {
      type: Number,
      default: undefined,
    },
    changeDisplay: null,
    sparkline: null,
    meta: null,
    onClick: {
      type: Function as PropType<() => void>,
      default: undefined,
    },
    className: { type: String, default: undefined },
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode => {
      const positive = props.changePct !== undefined && props.changePct > 0
      const negative = props.changePct !== undefined && props.changePct < 0
      const color = positive ? POSITIVE_COLOR : negative ? NEGATIVE_COLOR : undefined
      const arrow = positive ? '▲' : negative ? '▼' : '–'
      // React's `changeDisplay ?? `${changePct?.toFixed(2)}%``: a defined
      // display wins, else the formatted percentage (the pair is never both
      // absent when this renders).
      const changeText = props.changeDisplay ?? `${props.changePct?.toFixed(2)}%`
      const icon = slotOrProp(slots.icon, props.icon as VNodeChild | null | undefined)
      const name = slotOrProp(slots.name, props.name as VNodeChild | null | undefined)
      const sparkline = slotOrProp(
        slots.sparkline,
        props.sparkline as VNodeChild | null | undefined,
      )
      const meta = slotOrProp(slots.meta, props.meta as VNodeChild | null | undefined)
      return h(
        'div',
        {
          onClick: props.onClick,
          class: cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('py', 2),
            props.onClick ? cm.cursorPointer : undefined,
            props.className,
          ),
        },
        [
          ...(icon.length > 0 ? [h('div', { class: cm.shrink0 }, icon)] : []),
          h('div', { class: cm.cn(cm.flex1, cm.stack(0)) }, [
            h(
              'span',
              { class: cm.cn(cm.textSize('sm'), cm.fontWeight('bold')) },
              slotOrProp(slots.symbol, props.symbol as VNodeChild | null | undefined),
            ),
            ...(name.length > 0 ? [h('span', { class: cm.textSize('xs') }, name)] : []),
          ]),
          ...(sparkline.length > 0 ? [h('div', { class: cm.shrink0 }, sparkline)] : []),
          h('div', { class: cm.cn(cm.textCenter, cm.stack(0)) }, [
            h(
              'span',
              { class: cm.cn(cm.textSize('sm'), cm.fontWeight('semibold')) },
              slotOrProp(slots.price, props.price as VNodeChild | null | undefined),
            ),
            ...(props.changeDisplay !== undefined || props.changePct !== undefined
              ? [
                  h(
                    'span',
                    {
                      class: cm.cn(cm.textSize('xs'), cm.fontWeight('semibold')),
                      style: color ? { color } : undefined,
                    },
                    [`${arrow} `, changeText],
                  ),
                ]
              : []),
          ]),
          ...(meta.length > 0
            ? [h('div', { class: cm.cn(cm.textSize('xs'), cm.shrink0) }, meta)]
            : []),
        ],
      )
    }
  },
})
