/**
 * Skeleton component class generator for Svelte.
 *
 * @module
 */

import { getClassMap } from '@molecule/app-ui'

/**
 * Options for generating skeleton classes.
 */
export interface SkeletonClassOptions {
  circle?: boolean
  animation?: 'pulse' | 'wave' | 'none'
  className?: string
}

/**
 * Generate classes for a skeleton element.
 *
 * Usage in Svelte:
 * ```svelte
 * <script>
 *   import { getSkeletonClasses, getSkeletonStyle } from '`@molecule/app-ui-svelte`'
 *   export let width = undefined
 *   export let height = undefined
 *   export let circle = false
 *   export let animation = 'pulse'
 *   $: classes = getSkeletonClasses({ circle, animation })
 *   $: style = getSkeletonStyle({ width, height, circle, borderRadius })
 * </script>
 * <div class={classes} style={style} />
 * ```
 * @param options - The options.
 * @returns The resulting string.
 */
export function getSkeletonClasses(options: SkeletonClassOptions = {}): string {
  const { circle = false, animation = 'pulse', className } = options
  const cm = getClassMap()
  return cm.cn(
    cm.skeleton(),
    circle && cm.skeletonCircle,
    animation === 'none' && cm.skeletonNone,
    animation === 'wave' && cm.skeletonWave,
    className,
  )
}

/**
 * Generate inline style for a skeleton element.
 *
 * @param options - The style options.
 * @param options.width - The width of the skeleton element.
 * @param options.height - The height of the skeleton element.
 * @param options.circle - Whether the skeleton is circular.
 * @param options.borderRadius - Custom border radius value.
 * @returns The inline style string.
 */
export function getSkeletonStyle(options: {
  width?: string | number
  height?: string | number
  circle?: boolean
  borderRadius?: string | number
}): string {
  const { width, height, circle = false, borderRadius } = options
  const parts: string[] = []

  const widthStr = typeof width === 'number' ? `${width}px` : width
  const heightStr = typeof height === 'number' ? `${height}px` : height

  if (widthStr) {
    parts.push(`width:${widthStr}`)
  }

  if (heightStr) {
    parts.push(`height:${heightStr}`)
  } else if (circle && widthStr) {
    parts.push(`height:${widthStr}`)
  }

  if (circle) {
    parts.push('border-radius:9999px')
  } else if (borderRadius !== undefined) {
    const radiusStr = typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius
    parts.push(`border-radius:${radiusStr}`)
  }

  return parts.join(';')
}

/**
 * Generate classes and style for a SkeletonText component (multiple lines).
 * @param lines - The lines.
 * @returns The result.
 */
export function getSkeletonTextConfig(lines = 3): Array<{ width: string; height: number }> {
  return Array.from({ length: lines }).map((_, i) => ({
    width: i === lines - 1 ? '60%' : '100%',
    height: 16,
  }))
}

/**
 * Skeleton text container class.
 *
 * @returns The skeleton text container class string.
 */
export function getSkeletonTextContainerClass(): string {
  return getClassMap().skeletonTextContainer
}

/**
 * The skeleton text container class.
 *
 */
export const skeletonTextContainerClass = /* @__PURE__ */ getClassMap().skeletonTextContainer
