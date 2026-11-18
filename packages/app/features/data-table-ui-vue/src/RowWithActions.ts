/**
 * Vue `<tr>` wrapper with a trailing actions cell.
 *
 * Vue counterpart of `@molecule/app-data-table-ui-react`'s `RowWithActions` —
 * the same props (React names), the same ClassMap tokens, and the same DOM for
 * the same input.
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
 * `<tr>` wrapper that adds a trailing actions cell plus a click handler on the
 * body. Useful for data tables where each row has a trailing ellipsis-menu or a
 * row of action buttons.
 *
 * @param props - Component props (see `RowWithActionsProps`).
 * @returns The row component.
 */
export const RowWithActions = defineComponent({
  name: 'RowWithActions',
  props: {
    /** Row cells — the default slot. */
    children: { type: NODE_PROP, default: undefined },
    /** Action buttons/menu for the trailing cell (a node may arrive as the `actions` slot). */
    actions: { type: NODE_PROP, default: undefined },
    /** Called when the row body is clicked. */
    onClick: { type: Function as PropType<(() => void) | undefined>, default: undefined },
    /** Whether the row renders in a "selected" visual state. */
    selected: { type: Boolean as PropType<boolean | undefined>, default: undefined },
    /** Extra classes on the `<tr>`. */
    className: { type: String as PropType<string | undefined>, default: undefined },
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode =>
      h(
        'tr',
        {
          onClick: props.onClick,
          'aria-selected': props.selected,
          class: cm.cn(props.onClick ? cm.cursorPointer : undefined, props.className),
        },
        [
          ...slotOrProp(slots.default, props.children),
          ...(props.actions !== undefined || slots.actions
            ? [
                h(
                  'td',
                  {
                    onClick: (event: Event): void => event.stopPropagation(),
                    class: cm.cn(cm.textCenter),
                  },
                  slotOrProp(slots.actions, props.actions),
                ),
              ]
            : []),
        ],
      )
  },
})
