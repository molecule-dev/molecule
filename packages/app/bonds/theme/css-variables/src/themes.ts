/**
 * Built-in light and dark theme definitions for CSS variables provider.
 *
 * These themes use a modern color palette with blue as the primary brand color.
 * Colors are specified as hex/rgba values and will be applied as CSS custom
 * properties by the provider.
 *
 * @module
 */

import type { Theme } from '@molecule/app-theme'

/**
 * Default light theme.
 *
 * White backgrounds, dark text, blue primary (#3b82f6).
 */
export const lightTheme: Theme = {
  name: 'light',
  mode: 'light',
  colors: {
    background: '#f6f6f6',
    backgroundSecondary: '#eeeeee',
    backgroundTertiary: '#e8e8e8',
    surface: '#ffffff',
    surfaceSecondary: '#f8f8f8',
    inputBackground: '#ffffff',

    text: '#333333',
    textSecondary: '#808080',
    textTertiary: '#555555',
    textInverse: '#ffffff',

    primary: '#4070e0',
    primaryLight: '#6090f0',
    primaryDark: '#3060c0',
    secondary: '#808080',
    secondaryLight: '#a0a0a0',
    secondaryDark: '#606060',

    success: '#309000',
    successLight: '#dcfce7',
    warning: '#e0e040',
    warningLight: '#fef3c7',
    error: '#d02000',
    errorLight: '#fee2e2',
    info: '#17a2b8',
    infoLight: '#cffafe',

    border: '#e0e0e0',
    borderSecondary: '#d0d0d0',
    borderFocus: '#4070e0',

    overlay: 'rgba(0, 0, 0, 0.5)',
    shadow: 'rgba(0, 0, 0, 0.1)',
  },
  breakpoints: {
    mobileS: '320px',
    mobileM: '375px',
    mobileL: '425px',
    tablet: '768px',
    laptop: '1024px',
    laptopL: '1440px',
    desktop: '2560px',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
    xxxl: '64px',
  },
  typography: {
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
  },
  borderRadius: {
    none: '0',
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
  },
  transitions: {
    fast: '150ms ease',
    normal: '300ms ease',
    slow: '500ms ease',
  },
  zIndex: {
    hide: -1,
    base: 0,
    dropdown: 1000,
    sticky: 1100,
    fixed: 1200,
    modal: 1300,
    popover: 1400,
    tooltip: 1500,
    toast: 1600,
  },
}

/**
 * Default dark theme.
 *
 * Dark backgrounds (#0f172a, #1e293b), light text, blue primary (#60a5fa).
 */
export const darkTheme: Theme = {
  name: 'dark',
  mode: 'dark',
  colors: {
    background: '#0f172a',
    backgroundSecondary: '#1e293b',
    backgroundTertiary: '#334155',
    surface: '#1e293b',
    surfaceSecondary: '#293548',
    inputBackground: '#0a1020',

    text: '#f8fafc',
    textSecondary: '#cbd5e1',
    textTertiary: '#64748b',
    textInverse: '#0f172a',

    primary: '#60a5fa',
    primaryLight: '#93c5fd',
    primaryDark: '#3b82f6',
    secondary: '#94a3b8',
    secondaryLight: '#cbd5e1',
    secondaryDark: '#64748b',

    success: '#4ade80',
    successLight: '#14532d',
    warning: '#fbbf24',
    warningLight: '#422006',
    error: '#f87171',
    errorLight: '#450a0a',
    info: '#22d3ee',
    infoLight: '#083344',

    border: '#334155',
    borderSecondary: '#475569',
    borderFocus: '#60a5fa',

    overlay: 'rgba(0, 0, 0, 0.7)',
    shadow: 'rgba(0, 0, 0, 0.4)',
  },
  breakpoints: {
    mobileS: '320px',
    mobileM: '375px',
    mobileL: '425px',
    tablet: '768px',
    laptop: '1024px',
    laptopL: '1440px',
    desktop: '2560px',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
    xxxl: '64px',
  },
  typography: {
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
  },
  borderRadius: {
    none: '0',
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.15)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.25)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.35)',
  },
  transitions: {
    fast: '150ms ease',
    normal: '300ms ease',
    slow: '500ms ease',
  },
  zIndex: {
    hide: -1,
    base: 0,
    dropdown: 1000,
    sticky: 1100,
    fixed: 1200,
    modal: 1300,
    popover: 1400,
    tooltip: 1500,
    toast: 1600,
  },
}
