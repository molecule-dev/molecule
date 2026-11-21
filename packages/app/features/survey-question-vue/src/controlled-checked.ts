/**
 * A controlled radio's `checked` state, written the way React writes it.
 *
 * React treats creation and update differently: when it creates the input it
 * sets the `checked` property and the reflected `checked` attribute; on every
 * later render it sets only the property. A radio created unchecked and
 * selected later therefore has no `checked` attribute, and one created
 * selected and cleared keeps it. Vue's own `checked` binding rewrites the
 * attribute on every patch, so the matrix control writes `checked` through
 * this directive instead.
 *
 * @module
 */

import type { Directive } from 'vue'

/**
 * Writes a controlled `checked` value when the input is created: the property
 * and the reflected attribute.
 *
 * @param element - The radio input.
 * @param checked - The controlled value.
 */
function mountChecked(element: HTMLInputElement, checked: boolean): void {
  element.checked = checked
  if (checked) element.setAttribute('checked', '')
  else element.removeAttribute('checked')
}

/**
 * Writes a controlled `checked` value on a later render: the property only, so
 * the attribute keeps the state the input was created with.
 *
 * @param element - The radio input.
 * @param checked - The controlled value.
 */
function updateChecked(element: HTMLInputElement, checked: boolean): void {
  element.checked = checked
}

/**
 * The directive form of {@link mountChecked} and {@link updateChecked}:
 * `withDirectives(h('input', …), [[vControlledChecked, checked]])`. Leave
 * `checked` out of the input's own props.
 */
export const vControlledChecked: Directive<HTMLInputElement, boolean> = {
  mounted: (element, binding) => mountChecked(element, binding.value),
  updated: (element, binding) => updateChecked(element, binding.value),
}
