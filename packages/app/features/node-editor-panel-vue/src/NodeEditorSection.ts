/**
 * Vue labeled section inside the properties panel — the label uses the
 * canonical 11px uppercase-tracking-widest style, with an optional trailing
 * node on the right of the label row.
 *
 * Vue counterpart of `@molecule/app-node-editor-panel-react`'s
 * `NodeEditorSection` — the same props (React names), the same ClassMap tokens
 * and the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'

import type { NodeEditorSectionProps } from './types.js'
import { slotOrProp } from './utilities.js'

/**
 * Resolves React's `trailing ?? null`: an absent node contributes nothing, and
 * everything else renders.
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns The children to render, or null.
 */
const trailingNodes = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): VNodeChild[] | null => {
  if (slot) return slot()
  return prop != null ? [prop] : null
}

/**
 * Labeled section — the Vue counterpart of
 * `@molecule/app-node-editor-panel-react`'s `NodeEditorSection`.
 *
 * @param props - The label, the optional trailing node and the stack gap.
 * @returns The labeled section.
 */
export const NodeEditorSection = defineComponent({
  name: 'NodeEditorSection',
  props: {
    label: null,
    children: null,
    trailing: null,
    htmlFor: String,
    gap: { type: Number as () => NodeEditorSectionProps['gap'], default: 3 },
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode => {
      const trailing = trailingNodes(slots.trailing, props.trailing)
      return h('div', { class: cm.stack(props.gap ?? 3) }, [
        h('div', { class: cm.flex({ justify: 'between', align: 'center' }) }, [
          h(
            'label',
            {
              for: props.htmlFor,
              class: cm.cn(cm.fontWeight('bold'), cm.nodeEditorPanelSectionLabel),
            },
            slotOrProp(slots.label, props.label),
          ),
          trailing,
        ]),
        ...slotOrProp(slots.default, props.children),
      ])
    }
  },
})
