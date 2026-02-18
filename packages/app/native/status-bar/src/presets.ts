/**
 * `@molecule/app-status-bar`
 * Preset configurations for status bar
 */

import { configure } from './status-bar.js'
import type { StatusBarStyle } from './types.js'

/**
 * Preset status bar configurations
 */
export const presets = {
  /** Light theme - white background, dark content */
  light: {
    backgroundColor: '#ffffff',
    style: 'dark' as StatusBarStyle,
    visible: true,
    overlaysWebView: false,
  },

  /** Dark theme - black background, light content */
  dark: {
    backgroundColor: '#000000',
    style: 'light' as StatusBarStyle,
    visible: true,
    overlaysWebView: false,
  },

  /** Transparent overlay - for immersive content */
  transparent: {
    backgroundColor: '#00000000',
    style: 'light' as StatusBarStyle,
    visible: true,
    overlaysWebView: true,
  },

  /** Hidden - completely hide status bar */
  hidden: {
    visible: false,
  },
} as const

/**
 * Apply a named preset configuration to the status bar.
 * @param preset - The preset name: 'light', 'dark', 'transparent', or 'hidden'.
 * @returns A promise that resolves when the preset is applied.
 */
export async function applyPreset(preset: keyof typeof presets): Promise<void> {
  return configure(presets[preset])
}
