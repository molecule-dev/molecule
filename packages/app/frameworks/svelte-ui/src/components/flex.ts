/**
 * Flex component class generator for Svelte.
 *
 * @module
 */

import type { Size } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Options for generating flex classes.
 */
export interface FlexClassOptions {
  direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse'
  justify?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly'
  align?: 'start' | 'end' | 'center' | 'baseline' | 'stretch'
  wrap?: 'wrap' | 'nowrap' | 'wrap-reverse'
  gap?: Size | string | number
  className?: string
}

/**
 * Map direction values to classMap-compatible values.
 */
const directionToCm: Record<string, 'row' | 'col' | 'row-reverse' | 'col-reverse'> = {
  row: 'row',
  column: 'col',
  'row-reverse': 'row-reverse',
  'column-reverse': 'col-reverse',
}

/**
 * Generate classes for a flex container.
 *
 * Usage in Svelte:
 * ```svelte
 * <script>
 *   import { getFlexClasses, getFlexGapStyle } from '`@molecule/app-ui-svelte`'
 *   export let direction = 'row'
 *   export let justify = undefined
 *   export let align = undefined
 *   export let gap = undefined
 *   $: classes = getFlexClasses({ direction, justify, align, gap })
 *   $: gapStyle = getFlexGapStyle(gap)
 * </script>
 * <div class={classes} style={gapStyle}>
 *   <slot />
 * </div>
 * ```
 * @param options - The options.
 * @returns The resulting string.
 */
export function getFlexClasses(options: FlexClassOptions = {}): string {
  const { direction = 'row', justify, align, wrap, gap, className } = options

  const cm = getClassMap()
  const cmDirection = directionToCm[direction] || 'row'
  const cmGap =
    typeof gap === 'string' && ['xs', 'sm', 'md', 'lg', 'xl'].includes(gap)
      ? (gap as 'xs' | 'sm' | 'md' | 'lg' | 'xl')
      : undefined

  return cm.cn(
    cm.flex({
      direction: cmDirection,
      justify,
      align,
      wrap,
      gap: cmGap || undefined,
    }),
    /* numeric gap handled via getFlexGapStyle() inline style */
    className,
  )
}

/**
 * Get inline style for custom gap values.
 * Returns undefined if gap is a named Size or number.
 * @returns The result.
 */
const standardGaps = ['xs', 'sm', 'md', 'lg', 'xl']
/**
 * Gets the flex gap style.
 * @param gap - The gap.
 * @returns The result.
 */
export function getFlexGapStyle(gap?: Size | string | number): Record<string, string> | undefined {
  if (typeof gap === 'number') {
    return { gap: `${gap}px` }
  }
  if (typeof gap === 'string' && !standardGaps.includes(gap)) {
    return { gap }
  }
  return undefined
}
