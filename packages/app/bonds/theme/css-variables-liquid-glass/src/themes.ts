/**
 * Liquid glass light and dark theme definitions.
 *
 * Surfaces use translucent rgba values designed to pair with
 * backdrop-filter blur effects for a frosted glass appearance.
 *
 * @module
 */

import type { Theme } from '@molecule/app-theme'

/**
 * Liquid glass light theme.
 *
 * Translucent white surfaces over blurred backgrounds.
 */
export const lightTheme: Theme = {
  name: 'light',
  mode: 'light',
  colors: {
    background: '#f0f0f0',
    backgroundSecondary: '#e8e8e8',
    backgroundTertiary: '#e0e0e0',
    surface: 'rgba(255, 255, 255, 0.55)',
    surfaceSecondary: 'rgba(255, 255, 255, 0.35)',
    inputBackground: 'rgba(255, 255, 255, 0.7)',

    text: '#1a1a1a',
    textSecondary: '#555555',
    textTertiary: '#777777',
    textInverse: '#ffffff',

    primary: '#0071e3',
    primaryLight: '#3d9aff',
    primaryDark: '#0058b0',
    secondary: '#6e6e73',
    secondaryLight: '#8e8e93',
    secondaryDark: '#48484a',

    success: '#34c759',
    successLight: 'rgba(52, 199, 89, 0.15)',
    warning: '#ff9f0a',
    warningLight: 'rgba(255, 159, 10, 0.15)',
    error: '#ff3b30',
    errorLight: 'rgba(255, 59, 48, 0.15)',
    info: '#5ac8fa',
    infoLight: 'rgba(90, 200, 250, 0.15)',

    border: 'rgba(0, 0, 0, 0.12)',
    borderSecondary: 'rgba(0, 0, 0, 0.08)',
    borderFocus: '#0071e3',

    overlay: 'rgba(0, 0, 0, 0.3)',
    shadow: 'rgba(0, 0, 0, 0.08)',
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
      sans: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      serif: 'Georgia, "Times New Roman", Times, serif',
      mono: '"SF Mono", SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
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
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '22px',
    full: '9999px',
  },
  shadows: {
    none: 'none',
    sm: '0 1px 3px rgba(0, 0, 0, 0.06)',
    md: '0 4px 12px rgba(0, 0, 0, 0.08)',
    lg: '0 8px 24px rgba(0, 0, 0, 0.1)',
    xl: '0 16px 40px rgba(0, 0, 0, 0.12)',
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
 * Liquid glass dark theme.
 *
 * Translucent dark surfaces over blurred backgrounds.
 */
export const darkTheme: Theme = {
  name: 'dark',
  mode: 'dark',
  colors: {
    background: '#0a0a0a',
    backgroundSecondary: '#111111',
    backgroundTertiary: '#1a1a1a',
    surface: 'rgba(40, 40, 40, 0.55)',
    surfaceSecondary: 'rgba(50, 50, 50, 0.4)',
    inputBackground: 'rgba(30, 30, 30, 0.7)',

    text: '#f5f5f7',
    textSecondary: '#a1a1a6',
    textTertiary: '#6e6e73',
    textInverse: '#1d1d1f',

    primary: '#0a84ff',
    primaryLight: '#409cff',
    primaryDark: '#0064d2',
    secondary: '#8e8e93',
    secondaryLight: '#aeaeb2',
    secondaryDark: '#636366',

    success: '#30d158',
    successLight: 'rgba(48, 209, 88, 0.2)',
    warning: '#ffd60a',
    warningLight: 'rgba(255, 214, 10, 0.2)',
    error: '#ff453a',
    errorLight: 'rgba(255, 69, 58, 0.2)',
    info: '#64d2ff',
    infoLight: 'rgba(100, 210, 255, 0.2)',

    border: 'rgba(255, 255, 255, 0.12)',
    borderSecondary: 'rgba(255, 255, 255, 0.08)',
    borderFocus: '#0a84ff',

    overlay: 'rgba(0, 0, 0, 0.5)',
    shadow: 'rgba(0, 0, 0, 0.3)',
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
      sans: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      serif: 'Georgia, "Times New Roman", Times, serif',
      mono: '"SF Mono", SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
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
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '22px',
    full: '9999px',
  },
  shadows: {
    none: 'none',
    sm: '0 1px 3px rgba(0, 0, 0, 0.15)',
    md: '0 4px 12px rgba(0, 0, 0, 0.2)',
    lg: '0 8px 24px rgba(0, 0, 0, 0.25)',
    xl: '0 16px 40px rgba(0, 0, 0, 0.3)',
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
