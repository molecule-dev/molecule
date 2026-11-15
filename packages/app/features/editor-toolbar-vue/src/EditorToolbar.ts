/**
 * Vue editor-page top toolbar.
 *
 * Vue counterpart of `@molecule/app-editor-toolbar-react`'s `EditorToolbar` —
 * the same props (React names), the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-vue'

import type { ToolbarAction } from './types.js'

/** React's sticky inline style, written the way React writes it. */
const STICKY_STYLE = { position: 'sticky', top: '0px', zIndex: 10 } as const

/** React's divider inline style, written the way React writes it. */
const DIVIDER_STYLE = {
  width: '1px',
  height: '24px',
  opacity: 0.2,
  background: 'currentColor',
} as const

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
 * Editor-page top toolbar — title + optional version/status badge + primary
 * actions (Save, Publish, Test) + secondary icon actions.
 *
 * Renders React's exact DOM: the title row (leading, `<h1>`, badge) and the
 * actions row, with the same ClassMap tokens, the 1px divider between
 * non-empty primary and secondary groups, and the sticky inline style by
 * default (`sticky` defaults to true). Action `label`s render verbatim — the
 * component has no `t()` calls of its own.
 *
 * @param props - Component props (see {@link EditorToolbarProps} in
 *   `./types.js`).
 * @returns The toolbar component.
 */
export const EditorToolbar = defineComponent({
  name: 'EditorToolbar',
  props: {
    title: null,
    badge: null,
    primaryActions: { type: Array as PropType<ToolbarAction[]>, default: () => [] },
    secondaryActions: { type: Array as PropType<ToolbarAction[]>, default: () => [] },
    leading: null,
    sticky: { type: Boolean, default: true },
    className: String,
    dataMolId: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    /**
     * Renders one toolbar action as a Button, wrapped in a plain anchor when
     * it carries an href — React's `renderAction`.
     *
     * @param action - The action to render.
     * @param key - The render key React gives the action's element.
     * @returns The action's element.
     */
    const renderAction = (action: ToolbarAction, key: string): VNode => {
      const button = h(
        Button,
        {
          key,
          variant: action.variant ?? 'ghost',
          color: action.color,
          onClick: action.onClick,
          disabled: action.disabled,
        },
        {
          default: () => {
            const children: VNodeChild[] = []
            if (action.icon) children.push(action.icon)
            if (action.label) children.push(h('span', action.label))
            return children
          },
        },
      )
      return action.href ? h('a', { key, href: action.href }, [button]) : button
    }

    return (): VNode => {
      const actions: VNodeChild[] = []
      for (const action of props.primaryActions)
        actions.push(renderAction(action, `p-${action.id}`))
      if (props.secondaryActions.length > 0 && props.primaryActions.length > 0)
        actions.push(h('span', { 'aria-hidden': 'true', style: DIVIDER_STYLE }))
      for (const action of props.secondaryActions)
        actions.push(renderAction(action, `s-${action.id}`))

      return h(
        'div',
        {
          'data-mol-id': props.dataMolId,
          class: cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' }),
            cm.sp('px', 4),
            cm.sp('py', 2),
            props.className,
          ),
          style: props.sticky ? STICKY_STYLE : undefined,
        },
        [
          h('div', { class: cm.flex({ align: 'center', gap: 'sm' }) }, [
            ...slotOrProp(slots.leading, props.leading),
            h(
              'h1',
              { class: cm.cn(cm.textSize('base'), cm.fontWeight('semibold')) },
              slotOrProp(slots.title, props.title),
            ),
            ...slotOrProp(slots.badge, props.badge),
          ]),
          h('div', { class: cm.flex({ align: 'center', gap: 'sm' }) }, actions),
        ],
      )
    }
  },
})
