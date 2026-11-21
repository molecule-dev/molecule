/**
 * Helpers shared by the Vue properties-panel primitives: node-valued props
 * that may arrive as a prop or a same-named slot, React's truthiness rule for
 * an optional region, and a controlled input's `checked` state written the way
 * React writes it.
 *
 * @module
 */

import type { Directive, VNodeChild } from 'vue'

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot: the
 * slot wins, and an absent pair contributes nothing.
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns The children to render.
 */
export const slotOrProp = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): VNodeChild[] => {
  if (slot) return slot()
  return prop != null ? [prop] : []
}

/**
 * Whether React would render an optional node prop (`footer && …`): nothing
 * for `null`, `undefined`, `false` and the empty string, everything else.
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns True when the region renders.
 */
export const renders = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): boolean => (slot ? true : prop != null && prop !== false && prop !== '')

/**
 * A controlled radio's or checkbox's `checked` state, written the way React
 * writes it: the reflected attribute at creation and the property on every
 * later render (so a control created checked and turned off keeps the
 * attribute, and one created unchecked and turned on never gains it).
 */
export const vControlledChecked: Directive<HTMLInputElement, boolean> = {
  mounted: (element, binding) => {
    element.checked = binding.value
    if (binding.value) element.setAttribute('checked', '')
    else element.removeAttribute('checked')
  },
  updated: (element, binding) => {
    element.checked = binding.value
  },
}
