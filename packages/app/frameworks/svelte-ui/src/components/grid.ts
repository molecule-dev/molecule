/**
 * Grid component class generator for Svelte.
 *
 * @module
 */

import type { Size } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Options for generating grid classes.
 */
export interface GridClassOptions {
  columns?: number | string
  rows?: number | string
  gap?: Size | string | number
  columnGap?: Size | string | number
  rowGap?: Size | string | number
  className?: string
}

/**
 * Generate classes for a grid container.
 *
 * Usage in Svelte:
 * ```svelte
 * <script>
 *   import { getGridClasses, getGridStyle } from '`@molecule/app-ui-svelte`'
 *   export let columns = 3
 *   export let gap = 'md'
 *   $: classes = getGridClasses({ columns, gap })
 *   $: style = getGridStyle({ columns, gap })
 * </script>
 * <div class={classes} style={style}>
 *   <slot />
 * </div>
 * ```
 * @param options - The options.
 * @returns The resulting string.
 */
export function getGridClasses(options: GridClassOptions = {}): string {
  const { columns, gap, className } = options

  const cm = getClassMap()
  const cols = typeof columns === 'number' ? columns : undefined
  const cmGap =
    typeof gap === 'string' && ['xs', 'sm', 'md', 'lg', 'xl'].includes(gap)
      ? (gap as 'xs' | 'sm' | 'md' | 'lg' | 'xl')
      : undefined

  return cm.cn(
    cm.grid({ cols, gap: cmGap || undefined }),
    typeof columns === 'number' ? undefined : undefined, // cols handled by cm.grid
    typeof options.rows === 'number' && cm.gridRows(options.rows as number),
    className,
  )
}

/**
 * Generate inline style for a grid container.
 * Handles custom column/row templates and non-standard gap values.
 *
 * @param options - The grid style options.
 * @returns The inline style string.
 */
export function getGridStyle(options: GridClassOptions = {}): string {
  const { columns, rows, gap, columnGap, rowGap } = options
  const standardGaps = ['xs', 'sm', 'md', 'lg', 'xl']
  const parts: string[] = []

  if (typeof columns === 'string') {
    parts.push(`grid-template-columns:${columns}`)
  }

  if (typeof rows === 'string') {
    parts.push(`grid-template-rows:${rows}`)
  }

  if (typeof gap === 'number') {
    parts.push(`gap:${gap}px`)
  } else if (typeof gap === 'string' && !standardGaps.includes(gap)) {
    parts.push(`gap:${gap}`)
  }

  if (typeof columnGap === 'number') {
    parts.push(`column-gap:${columnGap}px`)
  } else if (typeof columnGap === 'string' && !standardGaps.includes(columnGap)) {
    parts.push(`column-gap:${columnGap}`)
  }

  if (typeof rowGap === 'number') {
    parts.push(`row-gap:${rowGap}px`)
  } else if (typeof rowGap === 'string' && !standardGaps.includes(rowGap)) {
    parts.push(`row-gap:${rowGap}`)
  }

  return parts.join(';')
}
