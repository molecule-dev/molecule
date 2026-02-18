/**
 * Theme utility functions for molecule.dev.
 *
 * @module
 */

import {
  darkColors,
  defaultBorderRadius,
  defaultBreakpoints,
  defaultShadows,
  defaultSpacing,
  defaultTransitions,
  defaultTypography,
  defaultZIndex,
  lightColors,
} from './themes.js'
import type { Theme } from './types.js'

/**
 * Creates a light theme by merging default light-mode tokens with
 * optional overrides for colors, spacing, typography, etc.
 *
 * @param overrides - Partial theme tokens to merge over the defaults.
 * @returns A complete `Theme` object with `mode: 'light'`.
 */
export const createLightTheme = (overrides?: Partial<Theme>): Theme => ({
  name: 'light',
  mode: 'light',
  colors: { ...lightColors, ...overrides?.colors },
  breakpoints: { ...defaultBreakpoints, ...overrides?.breakpoints },
  spacing: { ...defaultSpacing, ...overrides?.spacing },
  typography: { ...defaultTypography, ...overrides?.typography },
  borderRadius: { ...defaultBorderRadius, ...overrides?.borderRadius },
  shadows: { ...defaultShadows, ...overrides?.shadows },
  transitions: { ...defaultTransitions, ...overrides?.transitions },
  zIndex: { ...defaultZIndex, ...overrides?.zIndex },
  ...overrides,
})

/**
 * Creates a dark theme by merging default dark-mode tokens with
 * optional overrides for colors, spacing, typography, etc.
 *
 * @param overrides - Partial theme tokens to merge over the defaults.
 * @returns A complete `Theme` object with `mode: 'dark'`.
 */
export const createDarkTheme = (overrides?: Partial<Theme>): Theme => ({
  name: 'dark',
  mode: 'dark',
  colors: { ...darkColors, ...overrides?.colors },
  breakpoints: { ...defaultBreakpoints, ...overrides?.breakpoints },
  spacing: { ...defaultSpacing, ...overrides?.spacing },
  typography: { ...defaultTypography, ...overrides?.typography },
  borderRadius: { ...defaultBorderRadius, ...overrides?.borderRadius },
  shadows: { ...defaultShadows, ...overrides?.shadows },
  transitions: { ...defaultTransitions, ...overrides?.transitions },
  zIndex: { ...defaultZIndex, ...overrides?.zIndex },
  ...overrides,
})
