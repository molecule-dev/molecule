/**
 * Switch component class generator for Svelte.
 *
 * @module
 */

import type { Size } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Options for generating switch classes.
 */
export interface SwitchClassOptions {
  size?: Size
  checked?: boolean
  disabled?: boolean
  className?: string
}

/**
 * Generate classes for the switch track element.
 *
 * Usage in Svelte:
 * ```svelte
 * <script>
 *   import { getSwitchClasses, getSwitchThumbClasses, getSwitchWrapperClasses } from '`@molecule/app-ui-svelte`'
 *   export let checked = false
 *   export let size = 'md'
 *   export let disabled = false
 *   $: state = checked ? 'checked' : 'unchecked'
 *   $: trackClass = getSwitchClasses({ size })
 *   $: thumbClass = getSwitchThumbClasses({ size })
 *   $: wrapperClass = getSwitchWrapperClasses({ disabled })
 * </script>
 * <label class={wrapperClass}>
 *   <button type="button" role="switch" aria-checked={checked} data-state={state} class={trackClass} on:click>
 *     <span data-state={state} class={thumbClass} />
 *   </button>
 *   {#if label}<span class={cm.textSize('sm')}>{label}</span>{/if}
 * </label>
 * ```
 * @param options - The options.
 * @returns The resulting string.
 */
export function getSwitchClasses(options: SwitchClassOptions = {}): string {
  const { size = 'md', className } = options
  const cm = getClassMap()
  return cm.cn(cm.switchBase({ size }), className)
}

/**
 * Generate classes for the switch thumb element.
 *
 * @param options - The options.
 * @param options.size - The size of the switch thumb.
 * @returns The resulting class string.
 */
export function getSwitchThumbClasses(options: { size?: Size } = {}): string {
  const { size = 'md' } = options
  const cm = getClassMap()
  return cm.switchThumb({ size })
}

/**
 * Generate classes for the switch wrapper (label element).
 *
 * @param options - The options.
 * @param options.disabled - Whether the switch is disabled.
 * @returns The resulting class string.
 */
export function getSwitchWrapperClasses(options: { disabled?: boolean } = {}): string {
  const { disabled = false } = options
  const cm = getClassMap()
  return cm.cn(cm.controlLabel, disabled && cm.controlDisabled)
}

/**
 * Switch label text class.
 *
 * @returns The switch label text class string.
 */
export function getSwitchLabelTextClass(): string {
  return getClassMap().controlText
}

/**
 * Switch label text class constant.
 *
 * @deprecated Use getSwitchLabelTextClass() instead.
 */
export const switchLabelTextClass = /* @__PURE__ */ getClassMap().controlText
