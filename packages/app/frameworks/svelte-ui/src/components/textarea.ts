/**
 * Textarea component class generator for Svelte.
 *
 * @module
 */

import { getClassMap } from '@molecule/app-ui'

/**
 * Options for generating textarea classes.
 */
export interface TextareaClassOptions {
  error?: string
  required?: boolean
  className?: string
}

/**
 * Generate classes for a textarea element.
 *
 * Usage in Svelte:
 * ```svelte
 * <script>
 *   import { getTextareaClasses } from '`@molecule/app-ui-svelte`'
 *   export let error = ''
 *   $: classes = getTextareaClasses({ error })
 * </script>
 * <textarea class={classes} />
 * ```
 * @param options - The options.
 * @returns The resulting string.
 */
export function getTextareaClasses(options: TextareaClassOptions = {}): string {
  const { error, className } = options
  const cm = getClassMap()
  return cm.cn(cm.textarea({ error: !!error }), className)
}

/**
 * Generate classes for a textarea label.
 *
 * @param options - The options.
 * @param options.required - Whether the field is required.
 * @param options.className - Optional CSS class name to append.
 * @returns The resulting class string.
 */
export function getTextareaLabelClasses(
  options: { required?: boolean; className?: string } = {},
): string {
  const { required = false, className } = options
  const cm = getClassMap()
  return cm.cn(cm.label({ required }), cm.labelBlock, className)
}

/**
 * Textarea wrapper class.
 *
 * @returns The textarea wrapper class string.
 */
export function getTextareaWrapperClass(): string {
  return getClassMap().inputWrapper
}

/**
 * Textarea wrapper class constant.
 *
 * @deprecated Use getTextareaWrapperClass() instead.
 */
export const textareaWrapperClass = /* @__PURE__ */ getClassMap().inputWrapper

/**
 * Get the error message class string.
 *
 * @returns The textarea error class string.
 */
export function getTextareaErrorClass(): string {
  return getClassMap().formError
}

/**
 * Get the hint message class string.
 * @returns The resulting string.
 */
export function getTextareaHintClass(): string {
  return getClassMap().formHint
}
