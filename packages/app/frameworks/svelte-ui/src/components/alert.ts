/**
 * Alert component class generator for Svelte.
 *
 * @module
 */

import type { IconData } from '@molecule/app-icons'
import { getIcon } from '@molecule/app-icons'
import type { ColorVariant } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Map ColorVariant to alert variants.
 */
const statusVariantMap: Record<ColorVariant, 'default' | 'info' | 'success' | 'warning' | 'error'> =
  {
    primary: 'default',
    secondary: 'default',
    success: 'success',
    warning: 'warning',
    error: 'error',
    info: 'info',
  }

/**
 * Options for generating alert classes.
 */
export interface AlertClassOptions {
  status?: ColorVariant
  className?: string
}

/**
 * Generate classes for an alert container.
 *
 * Usage in Svelte:
 * ```svelte
 * <script>
 *   import { getAlertClasses, getAlertTitleClass, getAlertDescriptionClass } from '`@molecule/app-ui-svelte`'
 *   export let status = 'info'
 *   $: classes = getAlertClasses({ status })
 * </script>
 * <div role="alert" class={classes}>
 *   {#if title}<h5 class={getAlertTitleClass()}>{title}</h5>{/if}
 *   <div class={getAlertDescriptionClass()}><slot /></div>
 * </div>
 * ```
 * @param options - The options.
 * @returns The resulting string.
 */
export function getAlertClasses(options: AlertClassOptions = {}): string {
  const { status = 'info', className } = options
  const variant = statusVariantMap[status] || 'default'
  const cm = getClassMap()
  return cm.cn(cm.alert({ variant }), className)
}

/**
 * Get the alert title class string.
 *
 * @returns The alert title class string.
 */
export function getAlertTitleClass(): string {
  return getClassMap().alertTitle
}

/**
 * Get the alert description class string.
 *
 * @returns The alert description class string.
 */
export function getAlertDescriptionClass(): string {
  return getClassMap().alertDescription
}

/**
 * Dismiss button class.
 *
 * @returns The alert dismiss button class string.
 */
export function getAlertDismissClass(): string {
  return getClassMap().alertDismiss
}

/**
 * Icon container class.
 * @returns The resulting string.
 */
export function getAlertIconWrapperClass(): string {
  return getClassMap().alertIconWrapper
}

/**
 * Content wrapper class.
 * @returns The resulting string.
 */
export function getAlertContentClass(): string {
  return getClassMap().alertContent
}

/**
 * Alert dismiss class constant.
 *
 * @deprecated Use getAlertDismissClass() instead.
 */
export const alertDismissClass = /* @__PURE__ */ getClassMap().alertDismiss

/**
 * The alert icon class.
 *
 */
export const alertIconClass = /* @__PURE__ */ getClassMap().alertIconWrapper

/**
 * Alert content class constant.
 *
 * @deprecated Use getAlertContentClass() instead.
 */
export const alertContentClass = /* @__PURE__ */ getClassMap().alertContent

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
 * Get icon data for an alert status.
 *
 * @param status - Alert status variant (info, success, warning, error)
 * @returns Icon data from the current icon set, or null if status is unknown
 */
export function getAlertIconData(status: string): IconData | null {
  const name = statusIconMap[status]
  return name ? getIcon(name) : null
}

/**
 * Re-export status variant map for direct access.
 */
export const alertStatusVariantMap = statusVariantMap
