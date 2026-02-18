/**
 * Avatar component class generator for Svelte.
 *
 * @module
 */

import type { Size } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { getInitials } from '../utilities.js'

/**
 * Options for generating avatar classes.
 */
export interface AvatarClassOptions {
  size?: Size | number
  rounded?: boolean
  className?: string
}

/**
 * Generate classes for the avatar container.
 *
 * Usage in Svelte:
 * ```svelte
 * <script>
 *   import { getAvatarClasses, getAvatarImageClass, getAvatarFallbackClass, getAvatarCustomSize } from '`@molecule/app-ui-svelte`'
 *   import { getInitials } from '`@molecule/app-ui-svelte`'
 *   import { t } from '`@molecule/app-i18n`'
 *   export let src = ''
 *   export let name = ''
 *   export let size = 'md'
 *   $: classes = getAvatarClasses({ size })
 *   $: customSize = getAvatarCustomSize(size)
 *   $: initials = name ? getInitials(name) : ''
 * </script>
 * <div class={classes} style={customSize}>
 *   {#if src}
 *     <img {src} alt={alt || name || t('ui.avatar.alt')} class={getAvatarImageClass()} />
 *   {:else}
 *     <div class={getAvatarFallbackClass()}>
 *       {#if name}<span class={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>{initials}</span>{/if}
 *     </div>
 *   {/if}
 * </div>
 * ```
 * @param options - The options.
 * @returns The resulting string.
 */
export function getAvatarClasses(options: AvatarClassOptions = {}): string {
  const { size = 'md', rounded = true, className } = options
  const avatarSize = typeof size === 'number' ? undefined : size

  const cm = getClassMap()
  return cm.cn(cm.avatar({ size: avatarSize }), !rounded && cm.avatarSquare, className)
}

/**
 * Get inline style for custom (numeric) avatar size.
 * Returns undefined if size is a named Size.
 *
 * @param size - The avatar size value (named or numeric).
 * @returns An inline style object, or undefined for named sizes.
 */
export function getAvatarCustomSize(size: Size | number): Record<string, string> | undefined {
  if (typeof size === 'number') {
    return { width: `${size}px`, height: `${size}px` }
  }
  return undefined
}

/**
 * Get the avatar image class string.
 *
 * @returns The avatar image class string.
 */
export function getAvatarImageClass(): string {
  return getClassMap().avatarImage
}

/**
 * Get the avatar fallback class string.
 * @returns The resulting string.
 */
export function getAvatarFallbackClass(): string {
  return getClassMap().avatarFallback
}

/**
 * Avatar initials text class.
 *
 * @returns The avatar initials class string.
 */
export function getAvatarInitialsClass(): string {
  return getClassMap().avatarInitials
}

/**
 * Avatar fallback icon class.
 *
 * @returns The avatar fallback icon class string.
 */
export function getAvatarFallbackIconClass(): string {
  return getClassMap().avatarFallbackIcon
}

/**
 * Avatar initials class constant.
 *
 * @deprecated Use getAvatarInitialsClass() instead.
 */
export const avatarInitialsClass = getClassMap().avatarInitials

// Re-export getInitials for convenience
export { getInitials }
