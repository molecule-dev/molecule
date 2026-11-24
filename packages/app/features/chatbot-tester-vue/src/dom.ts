/**
 * DOM helpers shared by the Vue chatbot-tester components: rendering a
 * node-valued prop that may also arrive as a same-named slot, and reproducing
 * react-dom's controlled-`<select>` selection.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

import { toChildArray } from '@molecule/app-vue'

/**
 * The children a node-valued prop contributes: the same-named slot wins over
 * the prop, and a pair that renders nothing contributes nothing (an empty
 * slot list is absent, like React's `slot()`).
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns The children to render.
 */
export const nodeChildren = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): VNodeChild[] => {
  const nodes: VNodeChild[] = slot
    ? slot()
    : prop === null || prop === undefined
      ? []
      : Array.isArray(prop)
        ? prop
        : [prop]
  return toChildArray(nodes).length > 0 ? nodes : []
}

/**
 * Whether React would treat the node-valued prop as present: the resolved
 * content renders something (an empty slot list or an empty prop is absent).
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns True when the value renders.
 */
export const hasNodeValue = (slot: (() => VNodeChild[]) | undefined, prop: VNodeChild): boolean =>
  toChildArray(slot ? slot() : prop).length > 0

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
