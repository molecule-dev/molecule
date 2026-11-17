/**
 * Vue generic "thumbnail + text + actions" list-item row.
 *
 * Vue counterpart of `@molecule/app-list-item-row-react`'s `ListItemRow` —
 * the same props (React names), the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, useId, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot, with
 * React's truthiness: the slot wins when passed (it only exists when the
 * caller filled it), and a `''` / `null` prop renders nothing.
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
  return prop ? [prop] : []
}

/**
 * Generic "thumbnail + text + actions" row — used everywhere: navigation
 * lists, mobile menus, inbox-style threads, search results, picker dialogs,
 * bookmark lists, etc.
 *
 * With `onClick` the whole row is clickable through a transparent native
 * button over it, named by the title (`aria-labelledby`); Enter / Space on
 * that button run the same handler a click anywhere on the row runs, and the
 * inner controls (the `actions` slot) sit above the button and keep their own
 * clicks.
 *
 * Different from `<RowWithActions>` in `@molecule/app-data-table-ui-react`
 * in NOT being a `<tr>` — use this for non-table lists.
 *
 * @param props - Component props (see {@link ListItemRowProps}).
 * @returns The list-item row component.
 */
export const ListItemRow = defineComponent({
  name: 'ListItemRow',
  props: {
    title: null,
    subtitle: null,
    metadata: null,
    leading: null,
    actions: null,
    onClick: {
      type: Function as PropType<() => void>,
      default: undefined,
    },
    selected: {
      type: Boolean,
      default: undefined,
    },
    disabled: {
      type: Boolean,
      default: undefined,
    },
    density: {
      type: String as PropType<'comfortable' | 'compact'>,
      default: undefined,
    },
    className: { type: String, default: undefined },
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const nameId = useId()

    return (): VNode => {
      const padY = props.density === 'compact' ? 2 : 3
      const leading = slotOrProp(slots.leading, props.leading as VNodeChild | null | undefined)
      const subtitle = slotOrProp(slots.subtitle, props.subtitle as VNodeChild | null | undefined)
      const metadata = slotOrProp(slots.metadata, props.metadata as VNodeChild | null | undefined)
      const actions = slotOrProp(slots.actions, props.actions as VNodeChild | null | undefined)

      // The row's open control, rendered first like React's: an empty,
      // transparent native button stretched over the whole row (Enter / Space
      // activate it natively), under the content and under the actions slot.
      const openButton: VNodeChild | undefined = props.onClick
        ? h('button', {
            type: 'button',
            'aria-labelledby': nameId,
            'data-mol-id': 'list-item-row-open',
            disabled: props.disabled,
            onClick: () => {
              if (!props.disabled) props.onClick?.()
            },
            class: cm.cn(
              cm.position('absolute'),
              cm.inset0,
              props.disabled ? undefined : cm.cursorPointer,
            ),
            style: { background: 'transparent', border: 'none', padding: 0 },
          })
        : undefined

      const children: VNodeChild[] = [
        ...(openButton ? [openButton] : []),
        ...(leading.length > 0 ? [h('div', { class: cm.shrink0 }, leading)] : []),
        h('div', { class: cm.cn(cm.flex1, cm.stack(0)) }, [
          h(
            'div',
            {
              id: props.onClick ? nameId : undefined,
              class: cm.cn(cm.textSize('sm'), cm.fontWeight('semibold')),
            },
            slotOrProp(slots.title, props.title as VNodeChild | null | undefined),
          ),
          ...(subtitle.length > 0 ? [h('div', { class: cm.textSize('sm') }, subtitle)] : []),
          ...(metadata.length > 0 ? [h('div', { class: cm.textSize('xs') }, metadata)] : []),
        ]),
        ...(actions.length > 0
          ? [h('div', { class: cm.cn(cm.shrink0, cm.position('relative')) }, actions)]
          : []),
      ]

      return h(
        'div',
        {
          'aria-current': props.selected ? 'true' : undefined,
          'aria-disabled': props.disabled,
          class: cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 3),
            cm.sp('py', padY),
            props.onClick ? cm.position('relative') : undefined,
            props.className,
          ),
          style: props.disabled ? { opacity: 0.5 } : undefined,
        },
        children,
      )
    }
  },
})
