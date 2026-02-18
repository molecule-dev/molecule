/**
 * Checkbox component class generator for Svelte.
 *
 * @module
 */

import { getClassMap } from '@molecule/app-ui'

/**
 * Options for generating checkbox classes.
 */
export interface CheckboxClassOptions {
  error?: string
  className?: string
}

/**
 * Generate classes for a checkbox input element.
 *
 * Usage in Svelte:
 * ```svelte
 * <script>
 *   import { getCheckboxClasses, checkboxLabelWrapperClass } from '`@molecule/app-ui-svelte`'
 *   export let error = ''
 *   export let checked = false
 *   $: classes = getCheckboxClasses({ error })
 * </script>
 * <label class={checkboxLabelWrapperClass}>
 *   <input type="checkbox" bind:checked class={classes} data-state={checked ? 'checked' : 'unchecked'} />
 *   <span class={cm.textSize('sm')}>{label}</span>
 * </label>
 * ```
 * @param options - The options.
 * @returns The resulting string.
 */
export function getCheckboxClasses(options: CheckboxClassOptions = {}): string {
  const { error, className } = options
  const cm = getClassMap()
  return cm.cn(cm.checkbox({ error: !!error }), className)
}

/**
 * Wrapper class for the checkbox + label combination.
 *
 * @returns The checkbox label wrapper class string.
 */
export function getCheckboxLabelWrapperClass(): string {
  return getClassMap().controlLabel
}

/**
 * Checkbox label wrapper class constant.
 *
 * @deprecated Use getCheckboxLabelWrapperClass() instead.
 */
export const checkboxLabelWrapperClass = /* @__PURE__ */ getClassMap().controlLabel

/**
 * Class for the checkbox label text.
 *
 * @param disabled - Whether the checkbox is disabled.
 * @returns The checkbox label text class string.
 */
export function getCheckboxLabelTextClass(disabled?: boolean): string {
  const cm = getClassMap()
  return cm.cn(cm.controlText, disabled && cm.controlDisabled)
}

/**
 * Container class for the checkbox component.
 */
export const checkboxContainerClass = /* @__PURE__ */ getClassMap().controlContainer

/**
 * Error message class.
 *
 * @param className - Optional CSS class name to append.
 * @returns The checkbox error class string.
 */
export function getCheckboxErrorClass(className?: string): string {
  const cm = getClassMap()
  return cm.cn(cm.formError, cm.sp('mt', 1), className)
}
