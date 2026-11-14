/**
 * A controlled checkbox's or radio's `checked` state, written the way React
 * writes it.
 *
 * React treats creation and update differently: when it creates the input it
 * sets the `checked` property and the reflected `checked` attribute; on every
 * later render it sets only the property. A switch created unchecked and
 * turned on therefore has no `checked` attribute, and one created checked and
 * turned off keeps it. Vue's own `checked` binding rewrites the attribute on
 * every patch, so the UI components write `checked` through these helpers
 * instead.
 *
 * @module
 */

import type { Directive } from 'vue'

/**
 * Writes a controlled `checked` value when the input is created: the property
 * and the reflected attribute. `undefined` leaves an uncontrolled input alone,
 * so its `defaultChecked` applies.
 *
 * @param element - The checkbox or radio.
 * @param checked - The controlled value, or `undefined` when uncontrolled.
 */
export function mountChecked(element: HTMLInputElement, checked: boolean | undefined): void {
  if (checked === undefined) return
  element.checked = checked
  if (checked) element.setAttribute('checked', '')
  else element.removeAttribute('checked')
}

/**
 * Writes a controlled `checked` value on a later render: the property only,
 * so the attribute keeps the state the input was created with.
 *
 * @param element - The checkbox or radio.
 * @param checked - The controlled value, or `undefined` when uncontrolled.
 */
export function updateChecked(element: HTMLInputElement, checked: boolean | undefined): void {
  if (checked === undefined) return
  element.checked = checked
}

/**
 * `withDirectives(h('input', …), [[vControlledChecked, checked]])`: the
 * directive form of {@link mountChecked} and {@link updateChecked}, for an
 * input rendered in a list. Leave `checked` out of the input's own props.
 */
export const vControlledChecked: Directive<HTMLInputElement, boolean | undefined> = {
  mounted: (element, binding) => mountChecked(element, binding.value),
  updated: (element, binding) => updateChecked(element, binding.value),
}
