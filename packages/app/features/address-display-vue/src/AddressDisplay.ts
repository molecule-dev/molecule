/**
 * Vue formatted multi-line address display.
 *
 * Vue counterpart of `@molecule/app-address-display-react`'s `AddressDisplay`
 * — the same props (React names), the same ClassMap tokens, and the same DOM
 * for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'

import type { Address } from './types.js'

/**
 * Converts an Address object into an ordered array of non-empty display lines.
 * @param a
 * @returns The non-empty display lines, in postal order.
 */
function joinAddress(a: Address): string[] {
  const lines: string[] = []
  if (a.line1) lines.push(a.line1)
  if (a.line2) lines.push(a.line2)
  const cityState = [a.city, a.state].filter(Boolean).join(', ')
  const cityLine = [cityState, a.postalCode].filter(Boolean).join(' ')
  if (cityLine) lines.push(cityLine)
  if (a.country) lines.push(a.country)
  return lines
}

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot,
 * applying React's truthiness: the slot wins when present, and a falsy
 * string prop renders nothing (React's `{expr && <…>}` branch).
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns The children to render.
 */
const slotOrTruthy = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): VNodeChild[] => {
  if (slot) return slot()
  return prop ? [prop] : []
}

/**
 * Formatted multi-line address display with optional name, phone, leading
 * slot, and right-side actions. Set `inline` to render all fields on a single
 * line (e.g., in a table cell).
 *
 * The name, leading and actions are node-valued props: pass them as a prop or
 * as the same-named slot — both work.
 *
 * @param props - Component props (see {@link AddressDisplayProps}).
 * @returns The address display component.
 */
export const AddressDisplay = defineComponent({
  name: 'AddressDisplay',
  props: {
    address: { type: Object as PropType<Address>, required: true },
    name: null,
    phone: { type: String, default: undefined },
    leading: null,
    actions: null,
    inline: { type: Boolean, default: undefined },
    className: { type: String, default: undefined },
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode => {
      const lines = joinAddress(props.address)
      const body = props.inline
        ? h('span', lines.join(', '))
        : h(
            'address',
            { style: { fontStyle: 'normal' } },
            lines.map((line) => h('span', { style: { display: 'block' } }, line)),
          )
      const name = slotOrTruthy(slots.name, props.name)
      return h('div', { class: cm.cn(cm.flex({ align: 'start', gap: 'sm' }), props.className) }, [
        ...slotOrTruthy(slots.leading, props.leading),
        h('div', { class: cm.cn(cm.flex1, cm.stack(1), cm.textSize('sm')) }, [
          ...(name.length > 0 ? [h('span', { class: cm.fontWeight('semibold') }, name)] : []),
          body,
          ...(props.phone
            ? [h('a', { href: `tel:${props.phone}`, class: cm.link }, props.phone)]
            : []),
        ]),
        ...slotOrTruthy(slots.actions, props.actions),
      ])
    }
  },
})
