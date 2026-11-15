/**
 * Device-frame data + helpers for the preview panel.
 *
 * The preview header exposes a {@link DeviceFrameSelector} dropdown that lists
 * every device frame, plus a "Rotate" control that swaps a fixed-frame device
 * between portrait and landscape. The frame order, the icon + human label for
 * each frame, the fixed pixel DIMENSIONS used to size the preview iframe, and
 * the orientation-aware size resolver all live here as pure data/functions so
 * they can be unit tested and reused.
 *
 * @module
 */

import type { IconName } from '@molecule/app-icons'
import type { DeviceFrame } from '@molecule/app-live-preview'

/**
 * The device frames the selector dropdown lists, in display order.
 * `none` = responsive (no fixed frame, full width).
 */
export const DEVICE_FRAMES: readonly DeviceFrame[] = ['none', 'desktop', 'tablet', 'mobile']

/**
 * Per-frame display metadata: the icon-set glyph name and the i18n label
 * (key + English default) shown in the dropdown trigger + menu items.
 */
export const DEVICE_META: Record<
  DeviceFrame,
  { readonly icon: IconName; readonly labelKey: string; readonly label: string }
> = {
  none: { icon: 'browser', labelKey: 'ide.device.responsive', label: 'Responsive' },
  desktop: { icon: 'device-desktop', labelKey: 'ide.device.desktop', label: 'Desktop' },
  tablet: { icon: 'device-tablet', labelKey: 'ide.device.tablet', label: 'Tablet' },
  mobile: { icon: 'device-mobile', labelKey: 'ide.device.mobile', label: 'Mobile' },
}

/**
 * Preview-only iframe orientation. Portrait is the natural orientation of a
 * fixed-frame device; landscape swaps its width/height. This is a visual
 * preview concern that lives in {@link PreviewPanel}'s local state — it is NOT
 * part of the live-preview core state.
 */
export type DeviceOrientation = 'portrait' | 'landscape'

/**
 * Per-frame iframe sizing. `width`/`height` are the PORTRAIT CSS sizes; a
 * fixed-frame (`rotatable`) device swaps them in landscape. `'100%'` width with
 * a `null` height means "fluid" — fill the available preview area (responsive /
 * desktop have no fixed frame to rotate).
 */
export interface DeviceDimensions {
  /** Portrait CSS width (e.g. `'768px'`, or `'100%'` for a fluid frame). */
  readonly width: string
  /** Portrait CSS height in px (e.g. `'1024px'`), or `null` to fill the area. */
  readonly height: string | null
  /** Whether the frame has a fixed size that can be rotated portrait ⇄ landscape. */
  readonly rotatable: boolean
}

/**
 * The fixed pixel frame each device renders the preview iframe at. `none`
 * (responsive) and `desktop` are fluid — full width, full height, nothing to
 * rotate. `tablet` (768×1024) and `mobile` (375×667) are fixed frames that can
 * be rotated to landscape (swapping width/height).
 */
export const DEVICE_DIMENSIONS: Record<DeviceFrame, DeviceDimensions> = {
  none: { width: '100%', height: null, rotatable: false },
  desktop: { width: '100%', height: null, rotatable: false },
  tablet: { width: '768px', height: '1024px', rotatable: true },
  mobile: { width: '375px', height: '667px', rotatable: true },
}

/**
 * Whether a device frame can be rotated (true only for fixed-frame devices —
 * tablet and mobile). Responsive and desktop are full-width with nothing to
 * rotate, so the "Rotate" control is enabled only "where possible".
 * @param device - The device frame.
 * @returns `true` if the frame has a fixed size that can be rotated.
 */
export function isDeviceRotatable(device: DeviceFrame): boolean {
  return DEVICE_DIMENSIONS[device].rotatable
}

/**
 * Resolves the concrete iframe `width`/`height` for a device frame at a given
 * orientation. Fluid frames (responsive/desktop) ignore orientation and fill
 * the preview area (`width` from dims, `height: '100%'`). Fixed frames render
 * at their pixel size in portrait and at the swapped size in landscape.
 * @param device - The device frame.
 * @param orientation - The preview orientation.
 * @returns The CSS `width` and `height` to apply to the preview iframe.
 */
export function resolveDeviceSize(
  device: DeviceFrame,
  orientation: DeviceOrientation,
): { width: string; height: string } {
  const dims = DEVICE_DIMENSIONS[device]
  if (!dims.rotatable || dims.height === null) {
    // Fluid frame — fill the available preview area; nothing to rotate.
    return { width: dims.width, height: '100%' }
  }
  return orientation === 'landscape'
    ? { width: dims.height, height: dims.width }
    : { width: dims.width, height: dims.height }
}

/**
 * Returns the icon-set glyph name for a device frame.
 * @param device - The device frame.
 * @returns The icon name registered in the bonded icon set.
 */
export function deviceIconName(device: DeviceFrame): string {
  return DEVICE_META[device].icon
}
