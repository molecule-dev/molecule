/**
 * Icon utilities for Svelte components.
 *
 * @module
 */

import type { IconData } from '@molecule/app-icons'
import { getIcon } from '@molecule/app-icons'

/**
 * Gets icon data by name from the current icon set.
 *
 * @param name - Icon name
 * @returns Icon data for SVG rendering in Svelte templates
 */
export function getIconData(name: string): IconData {
  return getIcon(name)
}

/**
 * Status icon name mapping for Alert/Toast components.
 */
export const statusIconMap: Record<string, string> = {
  info: 'info-circle',
  success: 'check-circle',
  warning: 'exclamation-triangle',
  error: 'x-circle',
}
