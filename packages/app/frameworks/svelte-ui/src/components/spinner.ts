/**
 * Spinner component class generator for Svelte.
 *
 * @module
 */

import type { ColorVariant, Size } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * The standard color variant names.
 */
const standardColors: string[] = ['primary', 'secondary', 'success', 'warning', 'error', 'info']

/**
 * Options for generating spinner classes.
 */
export interface SpinnerClassOptions {
  size?: Size
  color?: ColorVariant | string
  className?: string
}

/**
 * Generate classes for a spinner element.
 *
 * Usage in Svelte:
 * ```svelte
 * <script>
 *   import { getSpinnerClasses, getSpinnerColorStyle } from '`@molecule/app-ui-svelte`'
 *   import { t } from '`@molecule/app-i18n`'
 *   export let size = 'md'
 *   export let color = undefined
 *   $: classes = getSpinnerClasses({ size })
 *   $: colorStyle = getSpinnerColorStyle(color)
 * </script>
 * <div role="status" aria-label={label || t('ui.spinner.loading')} class={classes} style={colorStyle}>
 *   {#if label}<span class="sr-only">{label}</span>{/if}
 * </div>
 * ```
 * @param options - The options.
 * @returns The resulting string.
 */
export function getSpinnerClasses(options: SpinnerClassOptions = {}): string {
  const { size = 'md', className } = options
  const cm = getClassMap()
  return cm.cn(cm.spinner({ size }), className)
}

/**
 * Get inline style for custom spinner color.
 * Returns undefined if the color is a standard variant or not provided.
 *
 * @param color - The color variant or custom color string.
 * @returns An inline style object, or undefined for standard variants.
 */
export function getSpinnerColorStyle(
  color?: ColorVariant | string,
): Record<string, string> | undefined {
  if (color && typeof color === 'string' && !standardColors.includes(color)) {
    return { borderColor: color, borderTopColor: 'transparent' }
  }
  return undefined
}

/**
 * Screen reader only class for spinner labels.
 *
 * @returns The screen reader only class string.
 */
export function getSpinnerSrOnlyClass(): string {
  return getClassMap().srOnly
}
