/**
 * Badge component class generator for Svelte.
 *
 * @module
 */

import type { ColorVariant, Size } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Options for generating badge classes.
 */
export interface BadgeClassOptions {
  color?: ColorVariant
  variant?: 'solid' | 'outline' | 'subtle'
  size?: Size
  rounded?: boolean
  className?: string
}

/**
 * Generate classes for a badge element.
 *
 * Usage in Svelte:
 * ```svelte
 * <script lang="ts">
 *   import { getBadgeClasses } from '@molecule/app-ui-svelte'
 *   let { color = 'primary', variant = 'solid', children } = $props()
 *   const classes = $derived(getBadgeClasses({ color, variant }))
 * </script>
 * <span class={classes}>{@render children?.()}</span>
 * ```
 * @param options - The options.
 * @returns The resulting string.
 */
export function getBadgeClasses(options: BadgeClassOptions = {}): string {
  const { color = 'primary', size, rounded = true, className } = options

  const cm = getClassMap()
  return cm.cn(cm.badge({ variant: color, size }), !rounded && cm.badgeSquare, className)
}
