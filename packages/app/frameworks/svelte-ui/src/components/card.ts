/**
 * Card component class generator for Svelte.
 *
 * @module
 */

import type { Size } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Creates a padding map.
 *
 * @returns The result.
 */
function createPaddingMap(): Record<Size | 'none', string> {
  const cm = getClassMap()
  return {
    none: cm.cardPadding('none'),
    xs: cm.cardPadding('xs'),
    sm: cm.cardPadding('sm'),
    md: cm.cardPadding('md'),
    lg: cm.cardPadding('lg'),
    xl: cm.cardPadding('xl'),
  }
}

/**
 * Options for generating card classes.
 */
export interface CardClassOptions {
  variant?: 'elevated' | 'outlined' | 'filled'
  padding?: Size | 'none'
  interactive?: boolean
  className?: string
}

/**
 * Map card variant names to classMap card variants.
 */
const variantMap: Record<string, 'default' | 'elevated' | 'outline' | 'ghost'> = {
  elevated: 'elevated',
  outlined: 'outline',
  filled: 'default',
}

/**
 * Generate classes for a card container.
 *
 * Usage in Svelte:
 * ```svelte
 * <script>
 *   import { getCardClasses, getCardHeaderClass, getCardTitleClass, getCardContentClass, getCardFooterClass } from '`@molecule/app-ui-svelte`'
 *   export let variant = 'elevated'
 *   export let padding = 'md'
 *   export let interactive = false
 *   $: classes = getCardClasses({ variant, padding, interactive })
 * </script>
 * <div class={classes} role={interactive ? 'button' : undefined} tabindex={interactive ? 0 : undefined}>
 *   <slot />
 * </div>
 * ```
 * @param options - The options.
 * @returns The resulting class string.
 */
export function getCardClasses(options: CardClassOptions = {}): string {
  const { variant = 'elevated', padding = 'md', interactive = false, className } = options
  const cmVariant = variantMap[variant] || 'default'

  const cm = getClassMap()
  return cm.cn(
    cm.card({ variant: cmVariant }),
    cm.cardPadding(padding),
    interactive && cm.cardInteractive,
    className,
  )
}

/**
 * Get the card header class string.
 *
 * @returns The card header class string.
 */
export function getCardHeaderClass(): string {
  return getClassMap().cardHeader
}

/**
 * Get the card title class string.
 *
 * @returns The card title class string.
 */
export function getCardTitleClass(): string {
  return getClassMap().cardTitle
}

/**
 * Get the card description class string.
 *
 * @returns The card description class string.
 */
export function getCardDescriptionClass(): string {
  return getClassMap().cardDescription
}

/**
 * Get the card content class string.
 *
 * @returns The card content class string.
 */
export function getCardContentClass(): string {
  return getClassMap().cardContent
}

/**
 * Get the card footer class string.
 * @returns The resulting string.
 */
export function getCardFooterClass(): string {
  return getClassMap().cardFooter
}

/**
 * Gets the card padding map.
 *
 * @returns The result.
 */
export function getCardPaddingMap(): Record<Size | 'none', string> {
  return createPaddingMap()
}

/**
 * Map of card padding.
 *
 */
export const cardPaddingMap: Record<Size | 'none', string> = /* @__PURE__ */ createPaddingMap()
