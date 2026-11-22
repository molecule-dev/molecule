/**
 * Input component class generator for Svelte.
 *
 * @module
 */

import type { Size } from '@molecule/app-ui'
import { getClassMap, type UIClassMap } from '@molecule/app-ui'

import { classAtLoad } from '../class-at-load.js'

/**
 * Options for generating input classes.
 */
export interface InputClassOptions {
  size?: Size
  error?: string
  hasLeftElement?: boolean
  hasRightElement?: boolean
  clearable?: boolean
  hasValue?: boolean
  required?: boolean
  className?: string
}

/**
 * Generate classes for an input element.
 *
 * Usage in Svelte:
 * ```svelte
 * <script lang="ts">
 *   import { getInputClasses } from '@molecule/app-ui-svelte'
 *   let { size = 'md', error = '' } = $props()
 *   const classes = $derived(getInputClasses({ size, error }))
 * </script>
 * <input class={classes} />
 * ```
 * @param options - The options.
 * @returns The resulting string.
 */
export function getInputClasses(options: InputClassOptions = {}): string {
  const {
    size = 'md',
    error,
    hasLeftElement = false,
    hasRightElement = false,
    clearable = false,
    hasValue = false,
    className,
  } = options

  const cm = getClassMap()
  return cm.cn(
    cm.input({ error: !!error, size }),
    hasLeftElement && cm.inputPadLeft,
    (hasRightElement || (clearable && hasValue)) && cm.inputPadRight,
    className,
  )
}

/**
 * Generate classes for an input label.
 *
 * @param options - The options.
 * @param options.required - Whether the field is required.
 * @param options.className - Optional CSS class name to append.
 * @returns The resulting class string.
 */
export function getInputLabelClasses(
  options: { required?: boolean; className?: string } = {},
): string {
  const { required = false, className } = options
  const cm = getClassMap()
  return cm.cn(cm.label({ required }), cm.labelBlock, className)
}

/**
 * Input wrapper class.
 *
 * @returns The input wrapper class string.
 */
export function getInputWrapperClass(): string {
  return getClassMap().inputWrapper
}

/**
 * Input relative container class (for left/right element positioning).
 *
 * @returns The input inner class string.
 */
export function getInputInnerClass(): string {
  return getClassMap().inputInner
}

/**
 * Left element container class.
 *
 * @returns The input left element class string.
 */
export function getInputLeftElementClass(): string {
  return getClassMap().inputLeftElement
}

/**
 * Right element container class.
 *
 * @returns The input right element class string.
 */
export function getInputRightElementClass(): string {
  return getClassMap().inputRightElement
}

/**
 * Clear button class.
 *
 * @returns The input clear button class string.
 */
export function getInputClearButtonClass(): string {
  return getClassMap().inputClearButton
}

/**
 * The input wrapper class.
 *
 *
 * Read once, when this module loads: an empty string when no class map is set by then, so importing
 * the package before `setClassMap()` is safe.
 */
export const inputWrapperClass = classAtLoad((cm: UIClassMap) => cm.inputWrapper)

/**
 * Input relative class constant.
 *
 * Read once, when this module loads: an empty string when no class map is set by then, so importing
 * the package before `setClassMap()` is safe.
 *
 * @deprecated Use getInputInnerClass() instead.
 */
export const inputRelativeClass = classAtLoad((cm: UIClassMap) => cm.inputInner)

/**
 * Input left element class constant.
 *
 * Read once, when this module loads: an empty string when no class map is set by then, so importing
 * the package before `setClassMap()` is safe.
 *
 * @deprecated Use getInputLeftElementClass() instead.
 */
export const inputLeftElementClass = classAtLoad((cm: UIClassMap) => cm.inputLeftElement)

/**
 * Input right element class constant.
 *
 * Read once, when this module loads: an empty string when no class map is set by then, so importing
 * the package before `setClassMap()` is safe.
 *
 * @deprecated Use getInputRightElementClass() instead.
 */
export const inputRightElementClass = classAtLoad((cm: UIClassMap) => cm.inputRightElement)

/**
 * Input clear button class constant.
 *
 * Read once, when this module loads: an empty string when no class map is set by then, so importing
 * the package before `setClassMap()` is safe.
 *
 * @deprecated Use getInputClearButtonClass() instead.
 */
export const inputClearButtonClass = classAtLoad((cm: UIClassMap) => cm.inputClearButton)

/**
 * Get the error message class string.
 * @returns The resulting string.
 */
export function getInputErrorClass(): string {
  return getClassMap().formError
}

/**
 * Get the hint message class string.
 *
 * @returns The input hint class string.
 */
export function getInputHintClass(): string {
  return getClassMap().formHint
}
