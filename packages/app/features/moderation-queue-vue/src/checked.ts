/**
 * Writes a checkbox's `checked` and `indeterminate` state the way React writes
 * a controlled input: the property and the reflected `checked` attribute when
 * the input is created, and only the live properties on later renders. A Vue
 * `checked` binding rewrites the attribute on every patch, so the queue writes
 * `checked` through this directive instead — a box created unchecked and
 * checked afterwards then has no attribute, and one created checked and
 * unchecked keeps it, exactly as React renders it.
 *
 * @module
 */

import type { Directive } from 'vue'

/** The live state a controlled checkbox carries (React's `checked` + `indeterminate`). */
export interface ControlledCheckboxState {
  /** Whether the box is checked. */
  checked: boolean
  /** Whether the box draws the indeterminate dash. */
  indeterminate?: boolean
}

/**
 * Writes `checked` (property + attribute at creation, property only later) and
 * `indeterminate` (property only, as React sets it from a ref callback).
 */
export const vModerationChecked: Directive<HTMLInputElement, ControlledCheckboxState> = {
  mounted: (element, binding) => {
    element.checked = binding.value.checked
    if (binding.value.checked) element.setAttribute('checked', '')
    else element.removeAttribute('checked')
    element.indeterminate = binding.value.indeterminate ?? false
  },
  updated: (element, binding) => {
    element.checked = binding.value.checked
    element.indeterminate = binding.value.indeterminate ?? false
  },
}
