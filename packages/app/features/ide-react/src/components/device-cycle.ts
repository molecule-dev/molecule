/**
 * Device-frame cycle helpers for the preview panel's single cycling button.
 *
 * The preview header exposes ONE button that cycles through the device frames
 * (instead of a row of four radio buttons). The order, the icon for each frame,
 * and the human label live here as pure data/functions so they can be unit
 * tested and reused.
 *
 * @module
 */

import type { DeviceFrame } from '@molecule/app-live-preview'

/**
 * The order the device-cycle button advances through on each click, wrapping
 * back to the start. `none` = responsive (no fixed frame, full width).
 */
export const DEVICE_CYCLE: readonly DeviceFrame[] = ['none', 'desktop', 'tablet', 'mobile']

/**
 * Per-frame display metadata: the icon-set glyph name and the i18n label
 * (key + English default) shown in the button tooltip.
 */
export const DEVICE_META: Record<
  DeviceFrame,
  { readonly icon: string; readonly labelKey: string; readonly label: string }
> = {
  none: { icon: 'browser', labelKey: 'ide.device.responsive', label: 'Responsive' },
  desktop: { icon: 'device-desktop', labelKey: 'ide.device.desktop', label: 'Desktop' },
  tablet: { icon: 'device-tablet', labelKey: 'ide.device.tablet', label: 'Tablet' },
  mobile: { icon: 'device-mobile', labelKey: 'ide.device.mobile', label: 'Mobile' },
}

/**
 * Returns the next device frame in the cycle, wrapping at the end. An unknown
 * frame falls back to the first entry so a click always advances.
 * @param current - The currently selected device frame.
 * @returns The next device frame in {@link DEVICE_CYCLE}.
 */
export function nextDevice(current: DeviceFrame): DeviceFrame {
  const index = DEVICE_CYCLE.indexOf(current)
  if (index === -1) return DEVICE_CYCLE[0]!
  return DEVICE_CYCLE[(index + 1) % DEVICE_CYCLE.length]!
}

/**
 * Returns the icon-set glyph name for a device frame.
 * @param device - The device frame.
 * @returns The icon name registered in the bonded icon set.
 */
export function deviceIconName(device: DeviceFrame): string {
  return DEVICE_META[device].icon
}
