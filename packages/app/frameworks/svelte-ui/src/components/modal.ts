/**
 * Modal component class generator for Svelte.
 *
 * @module
 */

import type { ModalSize } from '@molecule/app-ui'
import { getClassMap, type UIClassMap } from '@molecule/app-ui'

import { classAtLoad } from '../class-at-load.js'

/**
 * Options for generating modal content classes.
 */
export interface ModalClassOptions {
  size?: ModalSize
  className?: string
}

/**
 * Generate classes for the modal content container.
 *
 * Usage in Svelte:
 * ```svelte
 * <script lang="ts">
 *   import { getModalContentClasses, getModalOverlayClass, getModalWrapperClass, getModalHeaderClass, getModalTitleClass, getModalCloseClass, getModalBodyClass } from '@molecule/app-ui-svelte'
 *   let { open = $bindable(false), size = 'md', children } = $props()
 *   const contentClass = $derived(getModalContentClasses({ size }))
 *   function onOverlayClick() {
 *     open = false
 *   }
 *   function onClose() {
 *     open = false
 *   }
 * </script>
 * {#if open}
 *   <div class={getModalOverlayClass()} aria-hidden="true"></div>
 *   <div class={getModalWrapperClass()} onclick={onOverlayClick}>
 *     <div role="dialog" aria-modal="true" class={contentClass} onclick={(event: MouseEvent) => event.stopPropagation()}>
 *       <div class={getModalHeaderClass()}>
 *         <h2 class={getModalTitleClass()}>{title}</h2>
 *         <button class={getModalCloseClass()} onclick={onClose}>X</button>
 *       </div>
 *       <div class={getModalBodyClass()}>{@render children?.()}</div>
 *     </div>
 *   </div>
 * {/if}
 * ```
 * @param options - The options.
 * @returns The resulting string.
 */
export function getModalContentClasses(options: ModalClassOptions = {}): string {
  const { size = 'md', className } = options
  const cm = getClassMap()
  return cm.cn(cm.modal({ size }), className)
}

/**
 * Get the modal overlay class string.
 *
 * @returns The modal overlay class string.
 */
export function getModalOverlayClass(): string {
  return getClassMap().dialogOverlay
}

/**
 * Get the modal header class string.
 *
 * @returns The modal header class string.
 */
export function getModalHeaderClass(): string {
  return getClassMap().dialogHeader
}

/**
 * Get the modal footer class string.
 *
 * @returns The modal footer class string.
 */
export function getModalFooterClass(): string {
  return getClassMap().dialogFooter
}

/**
 * Get the modal title class string.
 * @returns The resulting string.
 */
export function getModalTitleClass(): string {
  return getClassMap().dialogTitle
}

/**
 * Get the modal description class string.
 * @returns The resulting string.
 */
export function getModalDescriptionClass(): string {
  return getClassMap().dialogDescription
}

/**
 * Get the modal close button class string.
 *
 * @returns The modal close button class string.
 */
export function getModalCloseClass(): string {
  return getClassMap().dialogClose
}

/**
 * Get the modal centering wrapper class string.
 *
 * @returns The modal wrapper class string.
 */
export function getModalWrapperClass(): string {
  return getClassMap().dialogWrapper
}

/**
 * Get the inline style for the modal centering wrapper. `dialogWrapper` has
 * no dedicated ClassMap resolver option (it's a fixed token, not a
 * `{ centered }`-parameterized one), so a top-anchored (non-centered) layout
 * is expressed via the one inline-style exception the workspace styling rule
 * allows for values ClassMap genuinely cannot express.
 *
 * Usage in Svelte:
 * ```svelte
 * <script lang="ts">
 *   import { getModalWrapperClass, getModalWrapperStyle } from '@molecule/app-ui-svelte'
 *   let { centered = true, onOverlayClick = () => {}, children } = $props()
 *   const wrapperStyle = $derived(getModalWrapperStyle(centered))
 * </script>
 * <div class={getModalWrapperClass()} style={wrapperStyle} onclick={onOverlayClick}>
 *   {@render children?.()}
 * </div>
 * ```
 * @param centered - Whether the modal is vertically centered. Defaults to `true`.
 * @returns An inline style object, or `undefined` when centered (the default).
 */
export function getModalWrapperStyle(centered = true): Record<string, string> | undefined {
  return centered ? undefined : { alignItems: 'flex-start' }
}

/**
 * Get the modal body class string.
 *
 * @returns The modal body class string.
 */
export function getModalBodyClass(): string {
  return getClassMap().dialogBody
}

/**
 * Modal body class.
 * Read once, when this module loads: an empty string when no class map is set by then, so importing
 * the package before `setClassMap()` is safe.
 *
 * @deprecated Use getModalBodyClass() instead.
 */
export const modalBodyClass = classAtLoad((cm: UIClassMap) => cm.dialogBody)
