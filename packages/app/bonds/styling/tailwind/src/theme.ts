/**
 * Theme conversion utilities for Tailwind CSS.
 *
 * @module
 */

import type { Theme } from './types.js'

// Re-export framework-agnostic themeToCSS from core
export { themeToCSS } from '@molecule/app-styling'

/**
 * Generates a Tailwind config extend object from a molecule theme.
 *
 * @example
 * ```typescript
 * // tailwind.config.ts
 * import { themeToTailwind } from '`@molecule/app-styling-tailwind`'
 * import { lightTheme } from '`@molecule/app-theme`'
 *
 * export default {
 *   theme: {
 *     extend: themeToTailwind(lightTheme)
 *   }
 * }
 * ```
 * @param theme - A molecule `Theme` object with colors, spacing, typography, shadows, etc.
 * @returns A Tailwind `theme.extend` object mapping molecule tokens to Tailwind config values.
 */
export const themeToTailwind = (theme: Theme): Record<string, Record<string, unknown>> => {
  return {
    colors: {
      background: {
        DEFAULT: theme.colors.background,
        secondary: theme.colors.backgroundSecondary,
        tertiary: theme.colors.backgroundTertiary,
      },
      surface: {
        DEFAULT: theme.colors.surface,
        secondary: theme.colors.surfaceSecondary,
      },
      foreground: {
        DEFAULT: theme.colors.text,
        secondary: theme.colors.textSecondary,
        tertiary: theme.colors.textTertiary,
        inverse: theme.colors.textInverse,
      },
      primary: {
        DEFAULT: theme.colors.primary,
        light: theme.colors.primaryLight,
        dark: theme.colors.primaryDark,
      },
      secondary: {
        DEFAULT: theme.colors.secondary,
        light: theme.colors.secondaryLight,
        dark: theme.colors.secondaryDark,
      },
      success: {
        DEFAULT: theme.colors.success,
        light: theme.colors.successLight,
      },
      warning: {
        DEFAULT: theme.colors.warning,
        light: theme.colors.warningLight,
      },
      error: {
        DEFAULT: theme.colors.error,
        light: theme.colors.errorLight,
      },
      info: {
        DEFAULT: theme.colors.info,
        light: theme.colors.infoLight,
      },
      border: {
        DEFAULT: theme.colors.border,
        secondary: theme.colors.borderSecondary,
        focus: theme.colors.borderFocus,
      },
    },
    spacing: {
      xs: theme.spacing.xs,
      sm: theme.spacing.sm,
      md: theme.spacing.md,
      lg: theme.spacing.lg,
      xl: theme.spacing.xl,
      '2xl': theme.spacing.xxl,
      '3xl': theme.spacing.xxxl,
    },
    borderRadius: {
      none: theme.borderRadius.none,
      sm: theme.borderRadius.sm,
      DEFAULT: theme.borderRadius.md,
      md: theme.borderRadius.md,
      lg: theme.borderRadius.lg,
      xl: theme.borderRadius.xl,
      full: theme.borderRadius.full,
    },
    boxShadow: {
      none: theme.shadows.none,
      sm: theme.shadows.sm,
      DEFAULT: theme.shadows.md,
      md: theme.shadows.md,
      lg: theme.shadows.lg,
      xl: theme.shadows.xl,
    },
    transitionDuration: {
      fast: theme.transitions.fast.split(' ')[0],
      DEFAULT: theme.transitions.normal.split(' ')[0],
      slow: theme.transitions.slow.split(' ')[0],
    },
    zIndex: {
      hide: String(theme.zIndex.hide),
      base: String(theme.zIndex.base),
      dropdown: String(theme.zIndex.dropdown),
      sticky: String(theme.zIndex.sticky),
      fixed: String(theme.zIndex.fixed),
      modal: String(theme.zIndex.modal),
      popover: String(theme.zIndex.popover),
      tooltip: String(theme.zIndex.tooltip),
      toast: String(theme.zIndex.toast),
    },
    fontFamily: {
      sans: theme.typography.fontFamily.sans,
      serif: theme.typography.fontFamily.serif,
      mono: theme.typography.fontFamily.mono,
    },
    fontSize: {
      xs: theme.typography.fontSize.xs,
      sm: theme.typography.fontSize.sm,
      base: theme.typography.fontSize.base,
      lg: theme.typography.fontSize.lg,
      xl: theme.typography.fontSize.xl,
      '2xl': theme.typography.fontSize['2xl'],
      '3xl': theme.typography.fontSize['3xl'],
      '4xl': theme.typography.fontSize['4xl'],
      '5xl': theme.typography.fontSize['5xl'],
    },
    fontWeight: {
      light: String(theme.typography.fontWeight.light),
      normal: String(theme.typography.fontWeight.normal),
      medium: String(theme.typography.fontWeight.medium),
      semibold: String(theme.typography.fontWeight.semibold),
      bold: String(theme.typography.fontWeight.bold),
    },
    lineHeight: {
      tight: String(theme.typography.lineHeight.tight),
      normal: String(theme.typography.lineHeight.normal),
      relaxed: String(theme.typography.lineHeight.relaxed),
    },
  }
}
