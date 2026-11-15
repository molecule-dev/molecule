/**
 * Vue standalone trend delta chip: `▲ 12%`.
 *
 * Vue counterpart of `@molecule/app-trend-chip-react`'s `TrendChip` — the
 * same props (React names), the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'

const ARROW = { up: '▲', down: '▼', flat: '–' } as const
const COLOR = { up: '#22c55e', down: '#ef4444', flat: '#94a3b8' } as const

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
 * The value's text for the default aria label: strings and numbers are React's
 * text children, so they reach the label; nodes do not (pass `ariaLabel`).
 *
 * @param prefix - The prefix prop value.
 * @returns The text, or `''` for a node prefix.
 */
const prefixText = (prefix: VNodeChild | null | undefined): string =>
  typeof prefix === 'string' || typeof prefix === 'number' ? String(prefix) : ''

/**
 * Standalone trend delta chip — `▲ 12%` style display for inline placement in
 * row/header/cell contexts. The trend color is applied inline; the layout and
 * type classes come from the ClassMap bond. Same props, same DOM as
 * `@molecule/app-trend-chip-react`'s `TrendChip`.
 *
 * @param props - Component props (see {@link TrendChipProps}).
 * @returns The trend chip component.
 */
export const TrendChip = defineComponent({
  name: 'TrendChip',
  props: {
    delta: { type: Number, required: true },
    direction: {
      type: String as PropType<'up' | 'down' | 'flat'>,
      default: undefined,
    },
    suffix: { type: String, default: '%' },
    prefix: null,
    variant: {
      type: String as PropType<'subtle' | 'pill'>,
      default: 'subtle',
    },
    ariaLabel: { type: String, default: undefined },
    className: { type: String, default: undefined },
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode => {
      const dir = props.direction ?? (props.delta > 0 ? 'up' : props.delta < 0 ? 'down' : 'flat')
      const color = COLOR[dir]
      const abs = Math.abs(props.delta)
      return h(
        'span',
        {
          'aria-label':
            props.ariaLabel ?? `${prefixText(props.prefix)}${ARROW[dir]} ${abs}${props.suffix}`,
          class: cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            props.className,
          ),
          style:
            props.variant === 'pill'
              ? { padding: '2px 6px', borderRadius: '999px', background: color, color: '#fff' }
              : { color },
        },
        [
          ...slotOrProp(slots.prefix, props.prefix),
          h('span', { 'aria-hidden': 'true' }, ARROW[dir]),
          h('span', [`${abs}`, props.suffix]),
        ],
      )
    }
  },
})
