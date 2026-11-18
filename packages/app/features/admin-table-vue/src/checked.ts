/**
 * Writes a checkbox's `checked` state the way React writes a controlled input:
 * the property and the reflected `checked` attribute when the input is
 * created, and only the property on later renders. A Vue `checked` binding
 * rewrites the attribute on every patch, so the table writes `checked` through
 * this directive instead — a box created unchecked and checked afterwards then
 * has no attribute, and one created checked and unchecked keeps it, exactly as
 * React renders it.
 *
 * @module
 */

import type { Directive } from 'vue'

/**
 * Writes a checkbox's `checked` state: property and attribute at creation,
 * property only afterwards.
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
