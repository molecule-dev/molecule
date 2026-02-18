/**
 * Default light and dark theme definitions for molecule.dev.
 *
 * @module
 */

import type {
  Theme,
  ThemeBorderRadius,
  ThemeBreakpoints,
  ThemeColors,
  ThemeShadows,
  ThemeSpacing,
  ThemeTransitions,
  ThemeTypography,
  ThemeZIndex,
} from './types.js'

/**
 * Default light theme colors.
 */
export const lightColors: ThemeColors = {
  background: '#ffffff',
  backgroundSecondary: '#f5f5f5',
  backgroundTertiary: '#eeeeee',
  surface: '#ffffff',
  surfaceSecondary: '#fafafa',
  inputBackground: '#ffffff',

  text: '#1a1a1a',
  textSecondary: '#666666',
  textTertiary: '#999999',
  textInverse: '#ffffff',

  primary: '#0066cc',
  primaryLight: '#3399ff',
  primaryDark: '#004d99',
  secondary: '#6c757d',
  secondaryLight: '#868e96',
  secondaryDark: '#495057',

  success: '#28a745',
  successLight: '#d4edda',
  warning: '#ffc107',
  warningLight: '#fff3cd',
  error: '#dc3545',
  errorLight: '#f8d7da',
  info: '#17a2b8',
  infoLight: '#d1ecf1',

  border: '#e0e0e0',
  borderSecondary: '#cccccc',
  borderFocus: '#0066cc',

  overlay: 'rgba(0, 0, 0, 0.5)',
  shadow: 'rgba(0, 0, 0, 0.1)',
}

/**
 * Default dark theme colors.
 */
export const darkColors: ThemeColors = {
  background: '#121212',
  backgroundSecondary: '#1e1e1e',
  backgroundTertiary: '#2d2d2d',
  surface: '#1e1e1e',
  surfaceSecondary: '#252525',
  inputBackground: '#181818',

  text: '#ffffff',
  textSecondary: '#b3b3b3',
  textTertiary: '#808080',
  textInverse: '#1a1a1a',

  primary: '#3399ff',
  primaryLight: '#66b3ff',
  primaryDark: '#0066cc',
  secondary: '#868e96',
  secondaryLight: '#adb5bd',
  secondaryDark: '#6c757d',

  success: '#28a745',
  successLight: '#1e4620',
  warning: '#ffc107',
  warningLight: '#4d3800',
  error: '#dc3545',
  errorLight: '#4d1a1f',
  info: '#17a2b8',
  infoLight: '#0d3d47',

  border: '#333333',
  borderSecondary: '#444444',
  borderFocus: '#3399ff',

  overlay: 'rgba(0, 0, 0, 0.7)',
  shadow: 'rgba(0, 0, 0, 0.3)',
}

/**
 * Default responsive breakpoints (320px mobileS → 2560px desktop).
 */
export const defaultBreakpoints: ThemeBreakpoints = {
  mobileS: '320px',
  mobileM: '375px',
  mobileL: '425px',
  tablet: '768px',
  laptop: '1024px',
  laptopL: '1440px',
  desktop: '2560px',
}

/**
 * Default spacing scale (4px xs → 64px xxxl).
 */
export const defaultSpacing: ThemeSpacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
  xxxl: '64px',
}

/**
 * Default typography scale (system font stacks, rem-based sizes, weight/line-height presets).
 */
export const defaultTypography: ThemeTypography = {
  fontFamily: {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    serif: 'Georgia, "Times New Roman", Times, serif',
    mono: 'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
    '5xl': '3rem',
  },
  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
}

/**
 * Default border radius.
 */
export const defaultBorderRadius: ThemeBorderRadius = {
  none: '0',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
}

/**
 * Default box-shadow scale (none → xl, rgba-based).
 */
export const defaultShadows: ThemeShadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
}

/**
 * Default CSS transition durations (150ms fast, 250ms normal, 350ms slow).
 */
export const defaultTransitions: ThemeTransitions = {
  fast: '150ms ease-in-out',
  normal: '250ms ease-in-out',
  slow: '350ms ease-in-out',
}

/**
 * Default z-index scale.
 */
export const defaultZIndex: ThemeZIndex = {
  hide: -1,
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  fixed: 1200,
  modal: 1300,
  popover: 1400,
  tooltip: 1500,
  toast: 1600,
}

/**
 * Default light theme.
 */
export const lightTheme: Theme = {
  name: 'light',
  mode: 'light',
  colors: lightColors,
  breakpoints: defaultBreakpoints,
  spacing: defaultSpacing,
  typography: defaultTypography,
  borderRadius: defaultBorderRadius,
  shadows: defaultShadows,
  transitions: defaultTransitions,
  zIndex: defaultZIndex,
}

/**
 * Default dark theme.
 */
export const darkTheme: Theme = {
  name: 'dark',
  mode: 'dark',
  colors: darkColors,
  breakpoints: defaultBreakpoints,
  spacing: defaultSpacing,
  typography: defaultTypography,
  borderRadius: defaultBorderRadius,
  shadows: defaultShadows,
  transitions: defaultTransitions,
  zIndex: defaultZIndex,
}
