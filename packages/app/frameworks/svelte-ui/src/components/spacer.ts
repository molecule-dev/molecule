/**
 * Spacer component class generator for Svelte.
 *
 * @module
 */

import type { Size } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Creates a spacer size map.
 *
 * @returns The result.
 */
function createSpacerSizeMap(): Record<Size, string> {
  const cm = getClassMap()
  return {
    xs: cm.spacer({ size: 'xs' }),
    sm: cm.spacer({ size: 'sm' }),
    md: cm.spacer({ size: 'md' }),
    lg: cm.spacer({ size: 'lg' }),
    xl: cm.spacer({ size: 'xl' }),
  }
}

/**
 * Options for generating spacer classes.
 */
export interface SpacerClassOptions {
  size?: Size | string | number
  horizontal?: boolean
  className?: string
}

/**
 * Generate classes for a spacer element.
 *
 * Usage in Svelte:
 * ```svelte
 * <script>
 *   import { getSpacerClasses, getSpacerStyle } from '`@molecule/app-ui-svelte`'
 *   export let size = 'md'
 *   export let horizontal = false
 *   $: classes = getSpacerClasses({ size, horizontal })
 *   $: style = getSpacerStyle({ size, horizontal })
 * </script>
 * <div class={classes} style={style} />
 * ```
 * @param options - The options.
 * @returns The resulting class string.
 */
export function getSpacerClasses(options: SpacerClassOptions = {}): string {
  const { size = 'md', horizontal = false, className } = options

  const cm = getClassMap()
  const sizeStr =
    typeof size === 'string' && ['xs', 'sm', 'md', 'lg', 'xl'].includes(size)
      ? (size as Size)
      : undefined
  return cm.cn(
    sizeStr
      ? cm.spacer({ size: sizeStr, horizontal })
      : horizontal
        ? cm.displayInlineBlock
        : cm.displayBlock,
    className,
  )
}

/**
 * Generate inline style for custom spacer sizes.
 *
 * @param options - The spacer style options.
 * @returns The inline style string.
 */
export function getSpacerStyle(options: SpacerClassOptions = {}): string {
  const { size = 'md', horizontal = false } = options

  if (typeof size === 'number') {
    return horizontal ? `width:${size}px;height:1px` : `height:${size}px;width:1px`
  }

  if (typeof size === 'string' && !['xs', 'sm', 'md', 'lg', 'xl'].includes(size)) {
    return horizontal ? `width:${size}` : `height:${size}`
  }

  return ''
}

/**
 * Map of spacer size.
 *
 */
export const spacerSizeMap: Record<Size, string> = /* @__PURE__ */ createSpacerSizeMap()
