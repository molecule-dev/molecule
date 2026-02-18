/**
 * Container component class generator for Svelte.
 *
 * @module
 */

import { getClassMap } from '@molecule/app-ui'

/**
 * Options for generating container classes.
 */
export interface ContainerClassOptions {
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' | string
  centered?: boolean
  className?: string
}

/**
 * Generate classes for a container element.
 *
 * Usage in Svelte:
 * ```svelte
 * <script>
 *   import { getContainerClasses, getContainerCustomStyle } from '`@molecule/app-ui-svelte`'
 *   export let maxWidth = 'lg'
 *   export let centered = true
 *   $: classes = getContainerClasses({ maxWidth, centered })
 *   $: customStyle = getContainerCustomStyle(maxWidth)
 * </script>
 * <div class={classes} style={customStyle}>
 *   <slot />
 * </div>
 * ```
 * @param options - The options.
 * @returns The resulting string.
 */
export function getContainerClasses(options: ContainerClassOptions = {}): string {
  const { maxWidth = 'lg', centered = true, className } = options
  const cm = getClassMap()
  const sizeParam = ['sm', 'md', 'lg', 'xl', '2xl', 'full'].includes(maxWidth)
    ? (maxWidth as 'sm' | 'md' | 'lg' | 'xl')
    : undefined
  return cm.cn(
    cm.container(sizeParam ? { size: sizeParam as 'sm' | 'md' | 'lg' | 'xl' } : undefined),
    centered && cm.mxAuto,
    className,
  )
}

/**
 * Get inline style for custom max-width values.
 * Returns undefined if maxWidth is a standard named value.
 *
 * @param maxWidth - The max-width value to evaluate.
 * @returns An inline style object, or undefined for standard sizes.
 */
export function getContainerCustomStyle(maxWidth: string): Record<string, string> | undefined {
  const standardSizes = ['sm', 'md', 'lg', 'xl', '2xl', 'full']
  if (!standardSizes.includes(maxWidth)) {
    return { maxWidth }
  }
  return undefined
}
