/**
 * Vue editor layout: sticky top bar → main canvas → optional side panel.
 *
 * Vue counterpart of `@molecule/app-editor-layout-react`'s `EditorLayout` —
 * the same props (React names), the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'

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
 * Three-region editor scaffold: sticky top bar + main canvas + optional
 * collapsible side panel.
 *
 * Used by blog post editors, product-listing editors, chatbot flow editors,
 * design canvases, etc. Node props (`topBar`, `canvas`, `sidePanel`) arrive as
 * a prop AND a same-named slot; components accept either.
 *
 * @param props - Component props (see {@link EditorLayoutProps}).
 * @returns The editor layout component.
 */
export const EditorLayout = defineComponent({
  name: 'EditorLayout',
  props: {
    topBar: null,
    canvas: null,
    sidePanel: null,
    sidePanelPosition: {
      type: String as PropType<'left' | 'right'>,
      default: 'right',
    },
    sidePanelOpen: { type: Boolean, default: true },
    className: String,
    dataMolId: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    /** The sticky bar's inline style, exactly as React writes it. */
    const barStyle = { position: 'sticky', top: 0, zIndex: 10 } as const

    return (): VNode => {
      const panel = slotOrProp(slots.sidePanel, props.sidePanel)
      const showPanel = (slots.sidePanel != null || props.sidePanel != null) && props.sidePanelOpen
      const position = props.sidePanelPosition
      return h(
        'div',
        {
          'data-mol-id': props.dataMolId,
          class: cm.cn(cm.flex({ direction: 'col' }), cm.h('screen'), props.className),
        },
        [
          h('div', { style: barStyle }, slotOrProp(slots.topBar, props.topBar)),
          h('div', { class: cm.cn(cm.flex({ align: 'stretch' }), cm.flex1) }, [
            showPanel && position === 'left' ? h('aside', { class: cm.shrink0 }, panel) : null,
            h('main', { class: cm.flex1 }, slotOrProp(slots.canvas, props.canvas)),
            showPanel && position === 'right' ? h('aside', { class: cm.shrink0 }, panel) : null,
          ]),
        ],
      )
    }
  },
})
