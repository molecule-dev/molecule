/**
 * Modal component class generator for Svelte.
 *
 * @module
 */

import type { ModalSize } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

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
 * <script>
 *   import { getModalContentClasses, getModalOverlayClass, getModalWrapperClass, getModalHeaderClass, getModalTitleClass, getModalCloseClass, getModalBodyClass } from '`@molecule/app-ui-svelte`'
 *   export let open = false
 *   export let size = 'md'
 *   $: contentClass = getModalContentClasses({ size })
 * </script>
 * {#if open}
 *   <div class={getModalOverlayClass()} aria-hidden="true"></div>
 *   <div class={getModalWrapperClass()} on:click={onOverlayClick}>
 *     <div role="dialog" aria-modal="true" class={contentClass} on:click|stopPropagation>
 *       <div class={getModalHeaderClass()}>
 *         <h2 class={getModalTitleClass()}>{title}</h2>
 *         <button class={getModalCloseClass()} on:click={onClose}>X</button>
 *       </div>
 *       <div class={getModalBodyClass()}><slot /></div>
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
 * Get the modal body class string.
 *
 * @returns The modal body class string.
 */
export function getModalBodyClass(): string {
  return getClassMap().dialogBody
}

/**
 * Modal body class.
 * @deprecated Use getModalBodyClass() instead.
 */
export const modalBodyClass = /* @__PURE__ */ getClassMap().dialogBody
