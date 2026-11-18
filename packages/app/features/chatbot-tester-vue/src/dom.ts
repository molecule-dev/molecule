/**
 * DOM helpers shared by the Vue chatbot-tester components: rendering a
 * node-valued prop that may also arrive as a same-named slot, and reproducing
 * react-dom's controlled-`<select>` selection.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/**
 * The children a node-valued prop contributes: the same-named slot wins over
 * the prop, and an absent pair contributes nothing.
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns The children to render.
 */
export const nodeChildren = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): VNodeChild[] => {
  if (slot) return slot()
  if (prop === null || prop === undefined) return []
  return Array.isArray(prop) ? prop : [prop]
}

/**
 * Whether React would treat the node-valued prop as present: the slot exists
 * (React receives a node array, which is always truthy), or the prop value is
 * truthy (React's `{value ? … : null}`).
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns True when the value renders.
 */
export const hasNodeValue = (slot: (() => unknown) | undefined, prop: unknown): boolean =>
  slot !== undefined || Boolean(prop)

/**
 * Reproduces react-dom's controlled-`<select>` selection: the option whose
 * value matches is selected, and when nothing matches the first non-disabled
 * option is. React never assigns `select.value`, so assigning it here would
 * deselect everything for a value no option carries.
 *
 * @param select - The `<select>` element.
 * @param value - The controlled value (React's `value ?? ''`).
 */
export const applyReactSelectSelection = (
  select: HTMLSelectElement | null | undefined,
  value: string,
): void => {
  if (!select) return
  let fallback: HTMLOptionElement | null = null
  for (const option of Array.from(select.options)) {
    if (option.value === value) {
      option.selected = true
      return
    }
    if (fallback === null && !option.disabled) fallback = option
  }
  if (fallback) fallback.selected = true
}
