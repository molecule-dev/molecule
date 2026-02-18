/**
 * Progress component class generator for Svelte.
 *
 * @module
 */

import type { ColorVariant, Size } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Creates a size height map.
 *
 * @returns The result.
 */
function createSizeHeightMap(): Record<Size, string> {
  const cm = getClassMap()
  return {
    xs: cm.progressHeight('xs'),
    sm: cm.progressHeight('sm'),
    md: cm.progressHeight('md'),
    lg: cm.progressHeight('lg'),
    xl: cm.progressHeight('xl'),
  }
}

/**
 * Creates a color map.
 *
 * @returns The result.
 */
function createColorMap(): Record<ColorVariant, string> {
  const cm = getClassMap()
  return {
    primary: cm.progressColor('primary'),
    secondary: cm.progressColor('secondary'),
    success: cm.progressColor('success'),
    warning: cm.progressColor('warning'),
    error: cm.progressColor('error'),
    info: cm.progressColor('info'),
  }
}

/**
 * Options for generating progress classes.
 */
export interface ProgressClassOptions {
  size?: Size
  color?: ColorVariant
  indeterminate?: boolean
  className?: string
}

/**
 * Generate classes for the progress bar track.
 *
 * Usage in Svelte:
 * ```svelte
 * <script>
 *   import { getProgressClasses, getProgressIndicatorClasses, getProgressPercentage } from '`@molecule/app-ui-svelte`'
 *   export let value = 0
 *   export let max = 100
 *   export let size = 'md'
 *   export let color = 'primary'
 *   $: percentage = getProgressPercentage(value, max)
 *   $: trackClass = getProgressClasses({ size })
 *   $: indicatorClass = getProgressIndicatorClasses({ color })
 * </script>
 * <div class={cm.w('full')}>
 *   <div class={trackClass} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
 *     <div class={indicatorClass} style="transform: translateX(-{100 - percentage}%)" />
 *   </div>
 * </div>
 * ```
 * @param options - The options.
 * @returns The resulting class string.
 */
export function getProgressClasses(options: ProgressClassOptions = {}): string {
  const { size = 'md', className } = options
  const cm = getClassMap()
  return cm.cn(cm.progress(), cm.progressHeight(size), className)
}

/**
 * Generate classes for the progress indicator bar.
 *
 * @param options - The options.
 * @param options.color - The color variant for the indicator.
 * @param options.indeterminate - Whether the progress is indeterminate.
 * @param options.className - Optional CSS class name to append.
 * @returns The resulting class string.
 */
export function getProgressIndicatorClasses(
  options: { color?: ColorVariant; indeterminate?: boolean; className?: string } = {},
): string {
  const { color = 'primary', indeterminate = false, className } = options
  const cm = getClassMap()
  return cm.cn(
    cm.progressBar(),
    cm.progressColor(color),
    indeterminate && cm.progressIndeterminate,
    className,
  )
}

/**
 * Calculate the percentage of progress.
 *
 * @param value - The current progress value.
 * @param max - The maximum progress value.
 * @returns The calculated percentage (0-100).
 */
export function getProgressPercentage(value: number, max = 100): number {
  return Math.min(Math.max((value / max) * 100, 0), 100)
}

/**
 * Progress wrapper class.
 *
 * @returns The progress wrapper class string.
 */
export function getProgressWrapperClass(): string {
  return getClassMap().progressWrapper
}

/**
 * Progress label container class.
 *
 * @returns The progress label container class string.
 */
export function getProgressLabelContainerClass(): string {
  return getClassMap().progressLabelContainer
}

/**
 * Progress label text class.
 *
 * @returns The progress label text class string.
 */
export function getProgressLabelTextClass(): string {
  return getClassMap().progressLabelText
}

/**
 * Progress wrapper class constant.
 *
 * @deprecated Use getProgressWrapperClass() instead.
 */
export const progressWrapperClass = getClassMap().progressWrapper

/**
 * The progress label container class.
 *
 */
export const progressLabelContainerClass = /* @__PURE__ */ getClassMap().progressLabelContainer

/**
 * Progress label class constant.
 *
 * @deprecated Use getProgressLabelTextClass() instead.
 */
export const progressLabelClass = /* @__PURE__ */ getClassMap().progressLabelText

/**
 * Progress size height map constant.
 *
 * @deprecated Use cm.progressHeight(size) instead.
 */
export const progressSizeHeightMap: Record<Size, string> = /* @__PURE__ */ createSizeHeightMap()

/**
 * Progress color map constant.
 *
 * @deprecated Use cm.progressColor(color) instead.
 */
export const progressColorMap: Record<ColorVariant, string> = /* @__PURE__ */ createColorMap()
