/**
 * Select component class generator for Svelte.
 *
 * @module
 */

import type { IconData } from '@molecule/app-icons'
import { getIcon } from '@molecule/app-icons'
import type { SelectOption, Size } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Options for generating select classes.
 */
export interface SelectClassOptions {
  size?: Size
  error?: string
  required?: boolean
  className?: string
}

/**
 * Generate classes for a select element.
 *
 * Usage in Svelte:
 * ```svelte
 * <script>
 *   import { getSelectClasses } from '`@molecule/app-ui-svelte`'
 *   export let size = 'md'
 *   export let error = ''
 *   $: classes = getSelectClasses({ size, error })
 * </script>
 * <select class={classes}>
 *   <slot />
 * </select>
 * ```
 * @param options - The options.
 * @returns The resulting string.
 */
export function getSelectClasses(options: SelectClassOptions = {}): string {
  const { size = 'md', error, className } = options
  const cm = getClassMap()
  return cm.cn(cm.select({ error: !!error, size }), cm.selectNative, className)
}

/**
 * Generate classes for a select label.
 *
 * @param options - The options.
 * @param options.required - Whether the field is required.
 * @param options.className - Optional CSS class name to append.
 * @returns The resulting class string.
 */
export function getSelectLabelClasses(
  options: { required?: boolean; className?: string } = {},
): string {
  const { required = false, className } = options
  const cm = getClassMap()
  return cm.cn(cm.label({ required }), cm.labelBlock, className)
}

/**
 * Get icon data for the select dropdown chevron.
 *
 * @returns Icon data for a downward chevron from the current icon set
 */
export function getSelectChevronIconData(): IconData {
  return getIcon('chevron-down')
}

/**
 * Group options by their group field for optgroup rendering.
 *
 * @param options - The select options to group.
 * @returns A record mapping group names to their options.
 */
export function groupSelectOptions<T = string>(
  options: SelectOption<T>[],
): Record<string, SelectOption<T>[]> {
  return options.reduce<Record<string, SelectOption<T>[]>>((acc, option) => {
    const group = option.group || ''
    if (!acc[group]) {
      acc[group] = []
    }
    acc[group].push(option)
    return acc
  }, {})
}

/**
 * Select wrapper class.
 *
 * @returns The select wrapper class string.
 */
export function getSelectWrapperClass(): string {
  return getClassMap().inputWrapper
}

/**
 * Select relative container class.
 * @returns The resulting string.
 */
export function getSelectInnerClass(): string {
  return getClassMap().inputInner
}

/**
 * The select wrapper class.
 *
 * @returns The result.
 */
export const selectWrapperClass = /* @__PURE__ */ getClassMap().inputWrapper

/**
 * Select relative class constant.
 *
 * @deprecated Use getSelectInnerClass() instead.
 */
export const selectRelativeClass = /* @__PURE__ */ getClassMap().inputInner

/**
 * Get the error message class string.
 *
 * @returns The select error class string.
 */
export function getSelectErrorClass(): string {
  return getClassMap().formError
}

/**
 * Get the hint message class string.
 * @returns The resulting string.
 */
export function getSelectHintClass(): string {
  return getClassMap().formHint
}
