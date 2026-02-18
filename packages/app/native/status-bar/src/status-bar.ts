/**
 * `@molecule/app-status-bar`
 * Status bar convenience functions
 */

import { getProvider } from './provider.js'
import type {
  StatusBarAnimation,
  StatusBarCapabilities,
  StatusBarConfig,
  StatusBarState,
  StatusBarStyle,
} from './types.js'

/**
 * Set the status bar background color.
 * @param color - Hex color (e.g., '#ffffff') or named color.
 * @returns A promise that resolves when the color is set.
 */
export async function setBackgroundColor(color: string): Promise<void> {
  return getProvider().setBackgroundColor(color)
}

/**
 * Set the status bar content style (dark or light icons and text).
 * @param style - The content style: 'dark' for dark icons, 'light' for light icons, or 'default'.
 * @returns A promise that resolves when the style is set.
 */
export async function setStyle(style: StatusBarStyle): Promise<void> {
  return getProvider().setStyle(style)
}

/**
 * Show the status bar with an optional animation.
 * @param animation - Animation type for showing: 'none', 'fade', or 'slide' (iOS only).
 * @returns A promise that resolves when the status bar is shown.
 */
export async function show(animation?: StatusBarAnimation): Promise<void> {
  return getProvider().show(animation)
}

/**
 * Hide the status bar with an optional animation.
 * @param animation - Animation type for hiding: 'none', 'fade', or 'slide' (iOS only).
 * @returns A promise that resolves when the status bar is hidden.
 */
export async function hide(animation?: StatusBarAnimation): Promise<void> {
  return getProvider().hide(animation)
}

/**
 * Set whether app content overlays (renders behind) the status bar.
 * @param overlay - Whether content should extend behind the status bar.
 * @returns A promise that resolves when the overlay setting is applied.
 */
export async function setOverlaysWebView(overlay: boolean): Promise<void> {
  return getProvider().setOverlaysWebView(overlay)
}

/**
 * Get the current status bar state including visibility, color, style, and height.
 * @returns The full status bar state.
 */
export async function getState(): Promise<StatusBarState> {
  return getProvider().getState()
}

/**
 * Get the current status bar height in pixels.
 * @returns The status bar height in pixels.
 */
export async function getHeight(): Promise<number> {
  return getProvider().getHeight()
}

/**
 * Apply multiple status bar settings at once (color, style, visibility, overlay).
 * @param config - The status bar configuration to apply.
 * @returns A promise that resolves when all settings are applied.
 */
export async function configure(config: StatusBarConfig): Promise<void> {
  return getProvider().configure(config)
}

/**
 * Get the platform's status bar capabilities.
 * @returns The capabilities indicating which status bar features are supported.
 */
export async function getCapabilities(): Promise<StatusBarCapabilities> {
  return getProvider().getCapabilities()
}
