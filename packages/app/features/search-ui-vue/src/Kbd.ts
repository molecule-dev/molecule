/**
 * Vue key cap — the counterpart of `@molecule/app-search-ui-react`'s `Kbd`.
 *
 * @module
 */

import { defineComponent, h, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'

/**
 * Resolves a node-valued prop that may also arrive as the default slot: the
 * slot wins, and an absent pair contributes nothing.
 *
 * @param slot - The default slot's render function, when the caller passed it.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns The children to render.
 */
const childrenOf = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): VNodeChild[] => {
  if (slot) return slot()
  if (prop === undefined || prop === null || prop === false) return []
  return Array.isArray(prop) ? prop : [prop]
}

/**
 * A key cap, for shortcut hints (`/` to focus, `↵` to open). The cap shows a
 * key name, not prose (a physical key such as `esc` reads the same in every
 * language), so it carries HTML's own `translate="no"`.
 *
 * @param props - See {@link KbdProps}.
 * @returns The key cap component.
 */
export const Kbd = defineComponent({
  name: 'Kbd',
  props: {
    children: null,
    className: String,
  },
  setup(props, { slots }) {
    return (): VNode => {
      const cm = getClassMap()
      return h(
        'kbd',
        { class: cm.cn(cm.kbd, props.className), translate: 'no' },
        childrenOf(slots.default, props.children),
      )
    }
  },
})
