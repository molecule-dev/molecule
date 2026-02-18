/**
 * Separator component class generator for Svelte.
 *
 * @module
 */

import { getClassMap } from '@molecule/app-ui'

/**
 * Options for generating separator classes.
 */
export interface SeparatorClassOptions {
  orientation?: 'horizontal' | 'vertical'
  className?: string
}

/**
 * Generate classes for a separator element.
 *
 * Usage in Svelte:
 * ```svelte
 * <script>
 *   import { getSeparatorClasses } from '`@molecule/app-ui-svelte`'
 *   export let orientation = 'horizontal'
 *   export let decorative = true
 *   $: classes = getSeparatorClasses({ orientation })
 * </script>
 * <div
 *   role={decorative ? 'none' : 'separator'}
 *   aria-orientation={decorative ? undefined : orientation}
 *   class={classes}
 * />
 * ```
 * @param options - The options.
 * @returns The resulting string.
 */
export function getSeparatorClasses(options: SeparatorClassOptions = {}): string {
  const { orientation = 'horizontal', className } = options
  const cm = getClassMap()
  return cm.cn(cm.separator({ orientation }), className)
}
