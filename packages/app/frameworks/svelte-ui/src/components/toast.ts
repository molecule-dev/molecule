/**
 * Toast component class generator for Svelte.
 *
 * @module
 */

import type { IconData } from '@molecule/app-icons'
import { getIcon } from '@molecule/app-icons'
import type { ColorVariant } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Map ColorVariant to toast variants.
 */
const statusVariantMap: Record<ColorVariant, 'default' | 'success' | 'warning' | 'error' | 'info'> =
  {
    primary: 'default',
    secondary: 'default',
    success: 'success',
    warning: 'warning',
    error: 'error',
    info: 'info',
  }

/**
 * Toast position type.
 */
export type ToastPosition =
  | 'top'
  | 'top-right'
  | 'top-left'
  | 'bottom'
  | 'bottom-right'
  | 'bottom-left'

/**
 * Toast data interface for programmatic toast management.
 */
export interface ToastData {
  id: string
  title?: string
  description?: string
  status?: ColorVariant
  duration?: number
  dismissible?: boolean
}

/**
 * Options for generating toast classes.
 */
export interface ToastClassOptions {
  status?: ColorVariant
  className?: string
}

/**
 * Generate classes for a toast element.
 *
 * Usage in Svelte:
 * ```svelte
 * <script>
 *   import { getToastClasses, getToastTitleClass, getToastDescriptionClass, getToastCloseClass } from '`@molecule/app-ui-svelte`'
 *   import { t } from '`@molecule/app-i18n`'
 *   export let status = 'info'
 *   $: classes = getToastClasses({ status })
 * </script>
 * <div role="alert" data-state="open" class={classes}>
 *   <span class={cm.toastIconWrapper}>{\@html icon}</span>
 *   <div class={cm.toastContentWrapper}>
 *     {#if title}<div class={getToastTitleClass()}>{title}</div>{/if}
 *     {#if description}<div class={getToastDescriptionClass()}>{description}</div>{/if}
 *   </div>
 *   {#if dismissible}
 *     <button class={getToastCloseClass()} on:click={onDismiss} aria-label={t('ui.toast.close')}>X</button>
 *   {/if}
 * </div>
 * ```
 * @param options - The options.
 * @returns The resulting string.
 */
export function getToastClasses(options: ToastClassOptions = {}): string {
  const { status = 'info', className } = options
  const variant = statusVariantMap[status] || 'default'
  const cm = getClassMap()
  return cm.cn(cm.toast({ variant }), className)
}

/**
 * Get the toast title class string.
 *
 * @returns The toast title class string.
 */
export function getToastTitleClass(): string {
  return getClassMap().toastTitle
}

/**
 * Get the toast description class string.
 *
 * @returns The toast description class string.
 */
export function getToastDescriptionClass(): string {
  return getClassMap().toastDescription
}

/**
 * Get the toast close button class string.
 *
 * @returns The toast close button class string.
 */
export function getToastCloseClass(): string {
  return getClassMap().toastClose
}

/**
 * Toast icon container class.
 * @returns The resulting string.
 */
export function getToastIconWrapperClass(): string {
  return getClassMap().toastIconWrapper
}

/**
 * Toast content wrapper class.
 * @returns The resulting string.
 */
export function getToastContentWrapperClass(): string {
  return getClassMap().toastContentWrapper
}

/**
 * Toast icon class constant.
 *
 * @deprecated Use getToastIconWrapperClass() instead.
 */
export const toastIconClass = getClassMap().toastIconWrapper

/**
 * The toast content class.
 *
 * @returns The result.
 */
export const toastContentClass = getClassMap().toastContentWrapper

/**
 * Creates a toast position classes.
 *
 * @returns The result.
 */
function createToastPositionClasses(): Record<ToastPosition, string> {
  const cm = getClassMap()
  return {
    top: cm.toastContainer({ position: 'top' }),
    'top-right': cm.toastContainer({ position: 'top-right' }),
    'top-left': cm.toastContainer({ position: 'top-left' }),
    bottom: cm.toastContainer({ position: 'bottom' }),
    'bottom-right': cm.toastContainer({ position: 'bottom-right' }),
    'bottom-left': cm.toastContainer({ position: 'bottom-left' }),
  }
}

/**
 * The toast position classes.
 *
 */
export const toastPositionClasses: Record<ToastPosition, string> =
  /* @__PURE__ */ createToastPositionClasses()

/**
 * Generate classes for the toast container.
 * @param position - The position.
 * @param className - The CSS class name.
 * @returns The resulting string.
 */
export function getToastContainerClasses(
  position: ToastPosition = 'bottom-right',
  className?: string,
): string {
  const cm = getClassMap()
  return cm.cn(cm.toastContainer({ position }), className)
}

/**
 * Status icon name mapping.
 */
const statusIconMap: Record<string, string> = {
  info: 'info-circle',
  success: 'check-circle',
  warning: 'exclamation-triangle',
  error: 'x-circle',
}

/**
 * Get icon data for a toast status.
 *
 * @param status - Toast status variant (info, success, warning, error)
 * @returns Icon data from the current icon set, or null if status is unknown
 */
export function getToastIconData(status: string): IconData | null {
  const name = statusIconMap[status]
  return name ? getIcon(name) : null
}

/**
 * Get icon data for the close/dismiss button.
 *
 * @returns Icon data for the X mark icon
 */
export function getToastCloseIconData(): IconData {
  return getIcon('x-mark')
}

/**
 * Re-export status variant map for direct access.
 */
export const toastStatusVariantMap = statusVariantMap

/**
 * Generate a unique toast ID.
 * @returns The transformed result.
 */
let toastCounter = 0
/**
 * Generates toast id.
 * @returns The created instance.
 */
export function generateToastId(): string {
  return `toast-${++toastCounter}`
}

/**
 * Create a toast store helper for Svelte stores.
 * Returns functions for managing toast state in a Svelte writable store.
 *
 * @returns An object with getToasts, addToast, and removeToast methods.
 */
export function createToastHelpers(): {
  getToasts(): ToastData[]
  addToast(toast: Omit<ToastData, 'id'>): string
  removeToast(id: string): void
} {
  let counter = 0
  const toasts: ToastData[] = []

  return {
    getToasts(): ToastData[] {
      return toasts
    },
    addToast(toast: Omit<ToastData, 'id'>): string {
      const id = `toast-${++counter}`
      toasts.push({ ...toast, id })
      return id
    },
    removeToast(id: string): void {
      const index = toasts.findIndex((t) => t.id === id)
      if (index !== -1) {
        toasts.splice(index, 1)
      }
    },
  }
}
