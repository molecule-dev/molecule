/**
 * Theme type definitions for molecule.dev.
 *
 * @module
 */

/**
 * Color palette definition.
 */
export interface ThemeColors {
  // Base colors
  background: string
  backgroundSecondary: string
  backgroundTertiary: string
  surface: string
  surfaceSecondary: string
  inputBackground: string

  // Text colors
  text: string
  textSecondary: string
  textTertiary: string
  textInverse: string

  // Brand colors
  primary: string
  primaryLight: string
  primaryDark: string
  secondary: string
  secondaryLight: string
  secondaryDark: string

  // Semantic colors
  success: string
  successLight: string
  warning: string
  warningLight: string
  error: string
  errorLight: string
  info: string
  infoLight: string

  // Border colors
  border: string
  borderSecondary: string
  borderFocus: string

  // Other
  overlay: string
  shadow: string
}

/**
 * Responsive viewport breakpoints from mobileS (320px) to desktop (2560px).
 */
export interface ThemeBreakpoints {
  mobileS: string // 320px
  mobileM: string // 375px
  mobileL: string // 425px
  tablet: string // 768px
  laptop: string // 1024px
  laptopL: string // 1440px
  desktop: string // 2560px
}

/**
 * Theme spacing scale mapping size tokens (xs–3xl) to CSS values (e.g. '4px', '16px').
 */
export interface ThemeSpacing {
  xs: string // 4px
  sm: string // 8px
  md: string // 16px
  lg: string // 24px
  xl: string // 32px
  xxl: string // 48px
  xxxl: string // 64px
}

/**
 * Typography scale (font families, sizes, weights, and line heights).
 */
export interface ThemeTypography {
  fontFamily: {
    sans: string
    serif: string
    mono: string
  }
  fontSize: {
    xs: string // 12px
    sm: string // 14px
    base: string // 16px
    lg: string // 18px
    xl: string // 20px
    '2xl': string // 24px
    '3xl': string // 30px
    '4xl': string // 36px
    '5xl': string // 48px
  }
  fontWeight: {
    light: number
    normal: number
    medium: number
    semibold: number
    bold: number
  }
  lineHeight: {
    tight: number
    normal: number
    relaxed: number
  }
}

/**
 * Border radius scale.
 */
export interface ThemeBorderRadius {
  none: string
  sm: string
  md: string
  lg: string
  xl: string
  full: string
}

/**
 * Box-shadow scale from none to xl for elevation levels.
 */
export interface ThemeShadows {
  none: string
  sm: string
  md: string
  lg: string
  xl: string
}

/**
 * CSS transition duration presets (fast, normal, slow).
 */
export interface ThemeTransitions {
  fast: string
  normal: string
  slow: string
}

/**
 * Theme z-index scale for layering UI elements (dropdowns, modals, toasts, etc.).
 */
export interface ThemeZIndex {
  hide: number
  base: number
  dropdown: number
  sticky: number
  fixed: number
  modal: number
  popover: number
  tooltip: number
  toast: number
}

/**
 * Complete theme definition.
 */
export interface Theme {
  name: string
  mode: 'light' | 'dark'
  colors: ThemeColors
  breakpoints: ThemeBreakpoints
  spacing: ThemeSpacing
  typography: ThemeTypography
  borderRadius: ThemeBorderRadius
  shadows: ThemeShadows
  transitions: ThemeTransitions
  zIndex: ThemeZIndex
}
