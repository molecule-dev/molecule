/**
 * RadioGroup component class generator for Svelte.
 *
 * @module
 */

import { getClassMap, type UIClassMap } from '@molecule/app-ui'

import { classAtLoad } from '../class-at-load.js'

/**
 * Options for generating radio classes.
 */
export interface RadioClassOptions {
  error?: string
  className?: string
}

/**
 * Generate classes for a radio input element.
 *
 * Usage in Svelte:
 * ```svelte
 * <script lang="ts">
 *   import { getRadioClasses, getRadioGroupClasses } from '@molecule/app-ui-svelte'
 *   let { direction = 'vertical', error = '' } = $props()
 *   const radioClass = $derived(getRadioClasses({ error }))
 *   const groupClass = $derived(getRadioGroupClasses(direction))
 * </script>
 * ```
 * @param options - The options.
 * @returns The resulting string.
 */
export function getRadioClasses(options: RadioClassOptions = {}): string {
  const { error, className } = options
  const cm = getClassMap()
  return cm.cn(cm.radio({ error: !!error }), cm.cursorPointer, className)
}

/**
 * Generate the group label classes.
 *
 * @param className - Optional CSS class name to append.
 * @returns The resulting class string.
 */
export function getRadioGroupLabelClasses(className?: string): string {
  const cm = getClassMap()
  return cm.cn(cm.label({}), cm.radioGroupLabel, className)
}

/**
 * Generate the flex container class for the radio options.
 *
 * @param direction - The layout direction of the radio group.
 * @returns The resulting class string.
 */
export function getRadioGroupClasses(direction: 'horizontal' | 'vertical' = 'vertical'): string {
  const cm = getClassMap()
  return cm.radioGroupLayout(direction)
}

/**
 * Generate the option label wrapper class.
 *
 * @param disabled - Whether the radio option is disabled.
 * @returns The resulting class string.
 */
export function getRadioOptionLabelClass(disabled?: boolean): string {
  const cm = getClassMap()
  return cm.cn(cm.controlLabel, disabled && cm.controlDisabled)
}

/**
 * Radio option text class.
 *
 * @returns The radio option text class string.
 */
export function getRadioOptionTextClass(): string {
  return getClassMap().controlText
}

/**
 * Radio option text class constant.
 *
 * Read once, when this module loads: an empty string when no class map is set by then, so importing
 * the package before `setClassMap()` is safe.
 *
 * @deprecated Use getRadioOptionTextClass() instead.
 */
export const radioOptionTextClass = classAtLoad((cm: UIClassMap) => cm.controlText)

/**
 * Error message class.
 *
 * @param className - Optional CSS class name to append.
 * @returns The radio error class string.
 */
export function getRadioErrorClass(className?: string): string {
  const cm = getClassMap()
  return cm.cn(cm.formError, cm.sp('mt', 1), className)
}
