/**
 * Vue table footer bar.
 *
 * Vue counterpart of `@molecule/app-data-table-ui-react`'s `TableFooter` — the
 * same props (React names), the same ClassMap tokens, and the same DOM for the
 * same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'

/** The props a node-valued field accepts as a plain string, so text is not type-checked away. */
const NODE_PROP = [Object, String] as PropType<VNodeChild>

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot: the
 * slot wins, and a value Vue renders as nothing (`undefined`, `null`, `''`,
 * `false`) contributes no node.
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
  if (prop === undefined || prop === null || prop === '' || prop === false) return []
  return [prop]
}

/**
 * Footer bar rendered below a table. Pass a pagination bar in `right`.
 *
 * @param props - Component props (see `TableFooterProps`).
 * @returns The footer component.
 */
export const TableFooter = defineComponent({
  name: 'TableFooter',
  props: {
    /** Left slot — typically a summary line (a node may arrive as the `left` slot). */
    left: { type: NODE_PROP, default: undefined },
    /** Right slot — typically a pagination bar (a node may arrive as the `right` slot). */
    right: { type: NODE_PROP, default: undefined },
    /** Extra classes. */
    className: { type: String as PropType<string | undefined>, default: undefined },
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode =>
      h(
        'div',
        {
          class: cm.cn(
            cm.flex({ justify: 'between', align: 'center', gap: 'sm', wrap: 'wrap' }),
            cm.sp('pt', 3),
            props.className,
          ),
        },
        [
          h('div', null, slotOrProp(slots.left, props.left)),
          h('div', null, slotOrProp(slots.right, props.right)),
        ],
      )
  },
})
