/**
 * Button component class generator for Svelte.
 *
 * @module
 */

import type { ButtonVariant, ColorVariant, Size } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Options for generating button classes.
 */
export interface ButtonClassOptions {
  variant?: ButtonVariant
  color?: ColorVariant
  size?: Size
  fullWidth?: boolean
  loading?: boolean
  disabled?: boolean
  className?: string
}

/**
 * Generate classes for a button component.
 *
 * Usage in Svelte:
 * ```svelte
 * <script lang="ts">
 *   import { getButtonClasses } from '@molecule/app-ui-svelte'
 *   let { variant = 'solid', color = 'primary', size = 'md', fullWidth = false, children, onclick } = $props()
 *   const classes = $derived(getButtonClasses({ variant, color, size, fullWidth }))
 * </script>
 * <button class={classes} onclick={onclick}>{@render children?.()}</button>
 * ```
 * @param options - The options.
 * @returns The resulting string.
 */
export function getButtonClasses(options: ButtonClassOptions = {}): string {
  const {
    variant = 'solid',
    color = 'primary',
    size = 'md',
    fullWidth = false,
    className,
  } = options

  const cm = getClassMap()
  return cm.cn(cm.button({ variant, color, size, fullWidth }), className)
}
