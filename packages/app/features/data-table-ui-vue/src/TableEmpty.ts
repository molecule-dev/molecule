/**
 * Vue single full-width empty row.
 *
 * Vue counterpart of `@molecule/app-data-table-ui-react`'s `TableEmpty` — the
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
 * Single full-width row shown when a table has no data. Typically wraps an
 * empty-state component.
 *
 * @param props - Component props (see `TableEmptyProps`).
 * @returns The empty row component.
 */
export const TableEmpty = defineComponent({
  name: 'TableEmpty',
  props: {
    /** Number of columns to span. */
    colSpan: { type: Number, required: true },
    /** Empty-state content — the default slot. */
    children: { type: NODE_PROP, default: undefined },
    /** Extra classes on the cell. */
    className: { type: String as PropType<string | undefined>, default: undefined },
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode =>
      h('tr', null, [
        h(
          'td',
          {
            colSpan: props.colSpan,
            class: cm.cn(cm.sp('py', 10), cm.textCenter, props.className),
          },
          slotOrProp(slots.default, props.children),
        ),
      ])
  },
})
