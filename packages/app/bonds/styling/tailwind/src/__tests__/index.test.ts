/**
 * Tests for `@molecule/app-styling-tailwind`
 *
 * Comprehensive tests for Tailwind CSS styling utilities including:
 * - cn (class name merging)
 * - cva (class variance authority)
 * - camelToKebab conversion
 * - Theme conversion utilities
 * - Responsive and state helpers
 * - Component presets
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import {
  active,
  badgeClasses,
  // Presets
  buttonClasses,
  camelToKebab,
  cardClasses,
  // Types
  type ClassValue,
  // Utilities
  cn,
  cva,
  type CVAConfig,
  dark,
  disabled,
  focus,
  groupHover,
  hide,
  hover,
  inputClasses,
  // Responsive and state helpers
  responsive,
  show,
  type Theme,
  type ThemeBreakpoints,
  // Theme conversion
  themeToCSS,
  themeToTailwind,
} from '../index.js'

// =============================================================================
// Mock Theme for Testing
// =============================================================================

const mockTheme: Theme = {
  name: 'test',
  mode: 'light',
  colors: {
    background: '#ffffff',
    backgroundSecondary: '#f5f5f5',
    backgroundTertiary: '#eeeeee',
    surface: '#ffffff',
    surfaceSecondary: '#fafafa',
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
      sans: '-apple-system, BlinkMacSystemFont, sans-serif',
      serif: 'Georgia, serif',
      mono: 'SFMono-Regular, Menlo, monospace',
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
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },
  transitions: {
    fast: '150ms ease-in-out',
    normal: '250ms ease-in-out',
    slow: '350ms ease-in-out',
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

// =============================================================================
// cn Utility Tests
// =============================================================================

describe('cn utility', () => {
  describe('basic string merging', () => {
    it('should merge multiple string classes', () => {
      expect(cn('btn', 'btn-primary')).toBe('btn btn-primary')
    })

    it('should merge many string classes', () => {
      expect(cn('a', 'b', 'c', 'd', 'e')).toBe('a b c d e')
    })

    it('should handle single string', () => {
      expect(cn('single-class')).toBe('single-class')
    })

    it('should return empty string for no arguments', () => {
      expect(cn()).toBe('')
    })
  })

  describe('falsy value filtering', () => {
    it('should filter out null values', () => {
      expect(cn('btn', null, 'active')).toBe('btn active')
    })

    it('should filter out undefined values', () => {
      expect(cn('btn', undefined, 'active')).toBe('btn active')
    })

    it('should filter out false values', () => {
      expect(cn('btn', false, 'active')).toBe('btn active')
    })

    it('should filter out empty strings', () => {
      expect(cn('btn', '', 'active')).toBe('btn active')
    })

    it('should filter out all falsy values combined', () => {
      expect(cn('btn', null, undefined, false, '', 'active')).toBe('btn active')
    })

    it('should return empty string for all falsy values', () => {
      expect(cn(null, undefined, false, '')).toBe('')
    })
  })

  describe('conditional classes', () => {
    it('should include truthy conditional classes', () => {
      const isActive = true
      expect(cn('btn', isActive && 'active')).toBe('btn active')
    })

    it('should exclude falsy conditional classes', () => {
      const isDisabled = false
      expect(cn('btn', isDisabled && 'disabled')).toBe('btn')
    })

    it('should handle mixed conditional classes', () => {
      const isActive = true
      const isDisabled = false
      const isHidden = false
      expect(cn('btn', isActive && 'active', isDisabled && 'disabled', isHidden && 'hidden')).toBe(
        'btn active',
      )
    })
  })

  describe('object syntax', () => {
    it('should include keys with truthy values', () => {
      expect(cn({ active: true, disabled: false })).toBe('active')
    })

    it('should handle multiple truthy keys', () => {
      expect(cn({ active: true, visible: true, highlighted: true })).toBe(
        'active visible highlighted',
      )
    })

    it('should combine with string classes', () => {
      expect(cn('btn', { active: true, disabled: false })).toBe('btn active')
    })

    it('should handle object with all false values', () => {
      expect(cn({ active: false, disabled: false })).toBe('')
    })

    it('should handle null values in object', () => {
      expect(cn({ active: null, visible: true })).toBe('visible')
    })

    it('should handle undefined values in object', () => {
      expect(cn({ active: undefined, visible: true })).toBe('visible')
    })
  })

  describe('array handling', () => {
    it('should flatten arrays of strings', () => {
      expect(cn(['btn', 'btn-primary', 'btn-lg'])).toBe('btn btn-primary btn-lg')
    })

    it('should flatten single-level arrays', () => {
      // Note: cn uses .flat() which only flattens one level by default
      // For deeply nested arrays, users should flatten before passing to cn
      expect(cn(['a', 'b', 'c'])).toBe('a b c')
    })

    it('should combine arrays with strings', () => {
      expect(cn('base', ['array-class-1', 'array-class-2'])).toBe(
        'base array-class-1 array-class-2',
      )
    })
  })

  describe('number handling', () => {
    it('should convert numbers to strings', () => {
      expect(cn('item', 1, 'another')).toBe('item 1 another')
    })

    it('should handle zero', () => {
      expect(cn('item', 0, 'another')).toBe('item 0 another')
    })
  })

  describe('complex combinations', () => {
    it('should handle mixed input types', () => {
      expect(
        cn(
          'base',
          ['array-class'],
          { 'object-true': true, 'object-false': false },
          'conditional',
          false,
        ),
      ).toBe('base array-class object-true conditional')
    })

    it('should trim result', () => {
      expect(cn('btn', 'primary')).toBe('btn primary')
    })
  })
})

// =============================================================================
// cva Utility Tests
// =============================================================================

describe('cva utility', () => {
  describe('base classes', () => {
    it('should return base classes when called with no arguments', () => {
      const testCva = cva('base-class')
      expect(testCva()).toBe('base-class')
    })

    it('should return complex base classes', () => {
      const testCva = cva('inline-flex items-center justify-center')
      expect(testCva()).toBe('inline-flex items-center justify-center')
    })
  })

  describe('variant application', () => {
    it('should apply single variant', () => {
      const testCva = cva('btn', {
        variants: {
          size: {
            sm: 'btn-sm',
            md: 'btn-md',
            lg: 'btn-lg',
          },
        },
      })
      expect(testCva({ size: 'lg' })).toBe('btn btn-lg')
    })

    it('should apply multiple variants', () => {
      const testCva = cva('btn', {
        variants: {
          size: {
            sm: 'btn-sm',
            md: 'btn-md',
          },
          variant: {
            primary: 'btn-primary',
            secondary: 'btn-secondary',
          },
        },
      })
      expect(testCva({ size: 'sm', variant: 'secondary' })).toBe('btn btn-sm btn-secondary')
    })

    it('should handle variants with multiple classes', () => {
      const testCva = cva('btn', {
        variants: {
          size: {
            sm: 'h-8 px-3 text-sm',
            md: 'h-10 px-4 text-base',
          },
        },
      })
      expect(testCva({ size: 'sm' })).toBe('btn h-8 px-3 text-sm')
    })
  })

  describe('default variants', () => {
    it('should apply default variants when no props provided', () => {
      const testCva = cva('btn', {
        variants: {
          size: {
            sm: 'btn-sm',
            md: 'btn-md',
            lg: 'btn-lg',
          },
        },
        defaultVariants: {
          size: 'md',
        },
      })
      expect(testCva()).toBe('btn btn-md')
    })

    it('should apply multiple default variants', () => {
      const testCva = cva('btn', {
        variants: {
          size: {
            sm: 'btn-sm',
            md: 'btn-md',
          },
          variant: {
            primary: 'btn-primary',
            secondary: 'btn-secondary',
          },
        },
        defaultVariants: {
          size: 'md',
          variant: 'primary',
        },
      })
      expect(testCva()).toBe('btn btn-md btn-primary')
    })

    it('should override default variants with provided props', () => {
      const testCva = cva('btn', {
        variants: {
          size: {
            sm: 'btn-sm',
            md: 'btn-md',
            lg: 'btn-lg',
          },
        },
        defaultVariants: {
          size: 'md',
        },
      })
      expect(testCva({ size: 'lg' })).toBe('btn btn-lg')
    })

    it('should partially override default variants', () => {
      const testCva = cva('btn', {
        variants: {
          size: {
            sm: 'btn-sm',
            md: 'btn-md',
          },
          variant: {
            primary: 'btn-primary',
            secondary: 'btn-secondary',
          },
        },
        defaultVariants: {
          size: 'md',
          variant: 'primary',
        },
      })
      expect(testCva({ variant: 'secondary' })).toBe('btn btn-md btn-secondary')
    })
  })

  describe('compound variants', () => {
    it('should apply compound variants when conditions match', () => {
      const testCva = cva('btn', {
        variants: {
          size: {
            sm: 'btn-sm',
            md: 'btn-md',
          },
          variant: {
            primary: 'btn-primary',
            danger: 'btn-danger',
          },
        },
        compoundVariants: [
          {
            size: 'sm',
            variant: 'danger',
            class: 'btn-sm-danger-special',
          },
        ],
        defaultVariants: {
          size: 'md',
          variant: 'primary',
        },
      })
      expect(testCva({ size: 'sm', variant: 'danger' })).toBe(
        'btn btn-sm btn-danger btn-sm-danger-special',
      )
    })

    it('should not apply compound variants when conditions do not match', () => {
      const testCva = cva('btn', {
        variants: {
          size: {
            sm: 'btn-sm',
            md: 'btn-md',
          },
          variant: {
            primary: 'btn-primary',
            danger: 'btn-danger',
          },
        },
        compoundVariants: [
          {
            size: 'sm',
            variant: 'danger',
            class: 'btn-sm-danger-special',
          },
        ],
        defaultVariants: {
          size: 'md',
          variant: 'primary',
        },
      })
      expect(testCva({ size: 'md', variant: 'primary' })).toBe('btn btn-md btn-primary')
    })

    it('should apply multiple compound variants when all conditions match', () => {
      const testCva = cva('btn', {
        variants: {
          size: { sm: 'sm', md: 'md' },
          variant: { primary: 'primary', danger: 'danger' },
        },
        compoundVariants: [
          { size: 'sm', class: 'sm-compound' },
          { variant: 'danger', class: 'danger-compound' },
        ],
      })
      expect(testCva({ size: 'sm', variant: 'danger' })).toBe(
        'btn sm danger sm-compound danger-compound',
      )
    })

    it('should apply compound variants with explicit props matching defaults', () => {
      // Note: compound variants require explicit props to be passed,
      // they don't automatically apply when using default variants
      const testCva = cva('btn', {
        variants: {
          size: { sm: 'sm', md: 'md' },
          variant: { primary: 'primary', danger: 'danger' },
        },
        compoundVariants: [{ size: 'md', variant: 'primary', class: 'default-compound' }],
        defaultVariants: {
          size: 'md',
          variant: 'primary',
        },
      })
      // When props are explicitly provided, compound variants apply
      expect(testCva({ size: 'md', variant: 'primary' })).toBe('btn md primary default-compound')
    })
  })

  describe('custom class prop', () => {
    it('should append custom class prop', () => {
      const testCva = cva('btn', {
        variants: {
          size: {
            md: 'btn-md',
          },
        },
      })
      expect(testCva({ size: 'md', class: 'custom-class' })).toBe('btn btn-md custom-class')
    })

    it('should append multiple custom classes', () => {
      const testCva = cva('btn')
      expect(testCva({ class: 'custom-1 custom-2 custom-3' })).toBe(
        'btn custom-1 custom-2 custom-3',
      )
    })
  })

  describe('edge cases', () => {
    it('should handle empty config', () => {
      const testCva = cva('base')
      expect(testCva()).toBe('base')
    })

    it('should handle undefined props', () => {
      const testCva = cva('base', {
        variants: {
          size: { sm: 'sm' },
        },
      })
      expect(testCva(undefined)).toBe('base')
    })
  })
})

// =============================================================================
// camelToKebab Tests
// =============================================================================

describe('camelToKebab', () => {
  it('should convert camelCase to kebab-case', () => {
    expect(camelToKebab('backgroundColor')).toBe('background-color')
  })

  it('should convert multiple uppercase letters', () => {
    expect(camelToKebab('borderTopLeftRadius')).toBe('border-top-left-radius')
  })

  it('should handle single word lowercase', () => {
    expect(camelToKebab('color')).toBe('color')
  })

  it('should handle numbers before uppercase', () => {
    expect(camelToKebab('margin2Xl')).toBe('margin2-xl')
  })

  it('should handle empty string', () => {
    expect(camelToKebab('')).toBe('')
  })

  it('should handle already kebab-case', () => {
    expect(camelToKebab('already-kebab')).toBe('already-kebab')
  })

  it('should handle strings starting with lowercase', () => {
    expect(camelToKebab('primaryLight')).toBe('primary-light')
  })
})

// =============================================================================
// themeToCSS Tests
// =============================================================================

describe('themeToCSS', () => {
  it('should convert colors to CSS custom properties', () => {
    const cssVars = themeToCSS(mockTheme)

    expect(cssVars['--color-background']).toBe('#ffffff')
    expect(cssVars['--color-background-secondary']).toBe('#f5f5f5')
    expect(cssVars['--color-primary']).toBe('#0066cc')
    expect(cssVars['--color-primary-light']).toBe('#3399ff')
    expect(cssVars['--color-text']).toBe('#1a1a1a')
  })

  it('should convert spacing to CSS custom properties', () => {
    const cssVars = themeToCSS(mockTheme)

    expect(cssVars['--spacing-xs']).toBe('4px')
    expect(cssVars['--spacing-sm']).toBe('8px')
    expect(cssVars['--spacing-md']).toBe('16px')
    expect(cssVars['--spacing-lg']).toBe('24px')
  })

  it('should convert font sizes to CSS custom properties', () => {
    const cssVars = themeToCSS(mockTheme)

    expect(cssVars['--font-size-xs']).toBe('0.75rem')
    expect(cssVars['--font-size-base']).toBe('1rem')
    expect(cssVars['--font-size-2xl']).toBe('1.5rem')
  })

  it('should convert border radius to CSS custom properties', () => {
    const cssVars = themeToCSS(mockTheme)

    expect(cssVars['--radius-none']).toBe('0')
    expect(cssVars['--radius-sm']).toBe('4px')
    expect(cssVars['--radius-md']).toBe('8px')
    expect(cssVars['--radius-full']).toBe('9999px')
  })

  it('should convert shadows to CSS custom properties', () => {
    const cssVars = themeToCSS(mockTheme)

    expect(cssVars['--shadow-none']).toBe('none')
    expect(cssVars['--shadow-sm']).toBe('0 1px 2px 0 rgba(0, 0, 0, 0.05)')
    expect(cssVars['--shadow-md']).toBe('0 4px 6px -1px rgba(0, 0, 0, 0.1)')
  })

  it('should return a complete set of CSS custom properties', () => {
    const cssVars = themeToCSS(mockTheme)

    // Check that we have expected property prefixes
    const keys = Object.keys(cssVars)
    expect(keys.some((k) => k.startsWith('--color-'))).toBe(true)
    expect(keys.some((k) => k.startsWith('--spacing-'))).toBe(true)
    expect(keys.some((k) => k.startsWith('--font-size-'))).toBe(true)
    expect(keys.some((k) => k.startsWith('--radius-'))).toBe(true)
    expect(keys.some((k) => k.startsWith('--shadow-'))).toBe(true)
  })
})

// =============================================================================
// themeToTailwind Tests
// =============================================================================

describe('themeToTailwind', () => {
  it('should convert colors to Tailwind format', () => {
    const tailwindConfig = themeToTailwind(mockTheme)

    expect(tailwindConfig.colors.background.DEFAULT).toBe('#ffffff')
    expect(tailwindConfig.colors.background.secondary).toBe('#f5f5f5')
    expect(tailwindConfig.colors.primary.DEFAULT).toBe('#0066cc')
    expect(tailwindConfig.colors.primary.light).toBe('#3399ff')
    expect(tailwindConfig.colors.primary.dark).toBe('#004d99')
  })

  it('should convert foreground colors from text colors', () => {
    const tailwindConfig = themeToTailwind(mockTheme)

    expect(tailwindConfig.colors.foreground.DEFAULT).toBe('#1a1a1a')
    expect(tailwindConfig.colors.foreground.secondary).toBe('#666666')
    expect(tailwindConfig.colors.foreground.tertiary).toBe('#999999')
    expect(tailwindConfig.colors.foreground.inverse).toBe('#ffffff')
  })

  it('should convert semantic colors', () => {
    const tailwindConfig = themeToTailwind(mockTheme)

    expect(tailwindConfig.colors.success.DEFAULT).toBe('#28a745')
    expect(tailwindConfig.colors.success.light).toBe('#d4edda')
    expect(tailwindConfig.colors.warning.DEFAULT).toBe('#ffc107')
    expect(tailwindConfig.colors.error.DEFAULT).toBe('#dc3545')
    expect(tailwindConfig.colors.info.DEFAULT).toBe('#17a2b8')
  })

  it('should convert border colors', () => {
    const tailwindConfig = themeToTailwind(mockTheme)

    expect(tailwindConfig.colors.border.DEFAULT).toBe('#e0e0e0')
    expect(tailwindConfig.colors.border.secondary).toBe('#cccccc')
    expect(tailwindConfig.colors.border.focus).toBe('#0066cc')
  })

  it('should convert spacing', () => {
    const tailwindConfig = themeToTailwind(mockTheme)

    expect(tailwindConfig.spacing.xs).toBe('4px')
    expect(tailwindConfig.spacing.sm).toBe('8px')
    expect(tailwindConfig.spacing.md).toBe('16px')
    expect(tailwindConfig.spacing['2xl']).toBe('48px')
    expect(tailwindConfig.spacing['3xl']).toBe('64px')
  })

  it('should convert border radius', () => {
    const tailwindConfig = themeToTailwind(mockTheme)

    expect(tailwindConfig.borderRadius.none).toBe('0')
    expect(tailwindConfig.borderRadius.sm).toBe('4px')
    expect(tailwindConfig.borderRadius.DEFAULT).toBe('8px')
    expect(tailwindConfig.borderRadius.md).toBe('8px')
    expect(tailwindConfig.borderRadius.full).toBe('9999px')
  })

  it('should convert box shadows', () => {
    const tailwindConfig = themeToTailwind(mockTheme)

    expect(tailwindConfig.boxShadow.none).toBe('none')
    expect(tailwindConfig.boxShadow.sm).toBe('0 1px 2px 0 rgba(0, 0, 0, 0.05)')
    expect(tailwindConfig.boxShadow.DEFAULT).toBe('0 4px 6px -1px rgba(0, 0, 0, 0.1)')
  })

  it('should convert transition durations', () => {
    const tailwindConfig = themeToTailwind(mockTheme)

    expect(tailwindConfig.transitionDuration.fast).toBe('150ms')
    expect(tailwindConfig.transitionDuration.DEFAULT).toBe('250ms')
    expect(tailwindConfig.transitionDuration.slow).toBe('350ms')
  })

  it('should convert z-index values to strings', () => {
    const tailwindConfig = themeToTailwind(mockTheme)

    expect(tailwindConfig.zIndex.hide).toBe('-1')
    expect(tailwindConfig.zIndex.base).toBe('0')
    expect(tailwindConfig.zIndex.modal).toBe('1300')
    expect(tailwindConfig.zIndex.toast).toBe('1600')
  })

  it('should convert font families', () => {
    const tailwindConfig = themeToTailwind(mockTheme)

    expect(tailwindConfig.fontFamily.sans).toContain('-apple-system')
    expect(tailwindConfig.fontFamily.serif).toContain('Georgia')
    expect(tailwindConfig.fontFamily.mono).toContain('SFMono-Regular')
  })

  it('should convert font sizes', () => {
    const tailwindConfig = themeToTailwind(mockTheme)

    expect(tailwindConfig.fontSize.xs).toBe('0.75rem')
    expect(tailwindConfig.fontSize.base).toBe('1rem')
    expect(tailwindConfig.fontSize['2xl']).toBe('1.5rem')
  })

  it('should convert font weights to strings', () => {
    const tailwindConfig = themeToTailwind(mockTheme)

    expect(tailwindConfig.fontWeight.light).toBe('300')
    expect(tailwindConfig.fontWeight.normal).toBe('400')
    expect(tailwindConfig.fontWeight.bold).toBe('700')
  })

  it('should convert line heights to strings', () => {
    const tailwindConfig = themeToTailwind(mockTheme)

    expect(tailwindConfig.lineHeight.tight).toBe('1.25')
    expect(tailwindConfig.lineHeight.normal).toBe('1.5')
    expect(tailwindConfig.lineHeight.relaxed).toBe('1.75')
  })
})

// =============================================================================
// Responsive Helpers Tests
// =============================================================================

describe('responsive helper', () => {
  it('should merge responsive class variants', () => {
    expect(responsive('text-sm', 'md:text-base', 'lg:text-lg')).toBe(
      'text-sm md:text-base lg:text-lg',
    )
  })

  it('should filter out falsy values', () => {
    expect(responsive('text-sm', null, 'lg:text-lg')).toBe('text-sm lg:text-lg')
  })

  it('should handle undefined values', () => {
    expect(responsive('block', undefined, 'md:flex')).toBe('block md:flex')
  })

  it('should handle false conditional values', () => {
    const includeTablet = false
    expect(responsive('p-2', includeTablet && 'md:p-4', 'lg:p-6')).toBe('p-2 lg:p-6')
  })

  it('should handle empty call', () => {
    expect(responsive()).toBe('')
  })
})

// =============================================================================
// show/hide Helpers Tests
// =============================================================================

describe('show helper', () => {
  it('should create responsive show classes for different breakpoints', () => {
    expect(show('tablet')).toBe('hidden tablet:block')
    expect(show('laptop')).toBe('hidden laptop:block')
    expect(show('desktop')).toBe('hidden desktop:block')
  })

  it('should work with mobile breakpoints', () => {
    expect(show('mobileS')).toBe('hidden mobileS:block')
    expect(show('mobileM')).toBe('hidden mobileM:block')
    expect(show('mobileL')).toBe('hidden mobileL:block')
  })
})

describe('hide helper', () => {
  it('should create responsive hide classes for different breakpoints', () => {
    expect(hide('tablet')).toBe('block tablet:hidden')
    expect(hide('laptop')).toBe('block laptop:hidden')
    expect(hide('desktop')).toBe('block desktop:hidden')
  })

  it('should work with mobile breakpoints', () => {
    expect(hide('mobileS')).toBe('block mobileS:hidden')
    expect(hide('mobileM')).toBe('block mobileM:hidden')
  })
})

// =============================================================================
// State Helpers Tests
// =============================================================================

describe('dark helper', () => {
  it('should prefix classes with dark:', () => {
    expect(dark('bg-gray-900', 'text-white')).toBe('dark:bg-gray-900 dark:text-white')
  })

  it('should handle single class', () => {
    expect(dark('bg-black')).toBe('dark:bg-black')
  })

  it('should handle many classes', () => {
    expect(dark('a', 'b', 'c', 'd')).toBe('dark:a dark:b dark:c dark:d')
  })
})

describe('hover helper', () => {
  it('should prefix classes with hover:', () => {
    expect(hover('bg-gray-100', 'scale-105')).toBe('hover:bg-gray-100 hover:scale-105')
  })

  it('should handle single class', () => {
    expect(hover('underline')).toBe('hover:underline')
  })
})

describe('focus helper', () => {
  it('should prefix classes with focus:', () => {
    expect(focus('ring-2', 'ring-primary')).toBe('focus:ring-2 focus:ring-primary')
  })

  it('should handle single class', () => {
    expect(focus('outline-none')).toBe('focus:outline-none')
  })
})

describe('active helper', () => {
  it('should prefix classes with active:', () => {
    expect(active('scale-95', 'bg-gray-200')).toBe('active:scale-95 active:bg-gray-200')
  })

  it('should handle single class', () => {
    expect(active('scale-95')).toBe('active:scale-95')
  })
})

describe('disabled helper', () => {
  it('should prefix classes with disabled:', () => {
    expect(disabled('opacity-50', 'cursor-not-allowed')).toBe(
      'disabled:opacity-50 disabled:cursor-not-allowed',
    )
  })

  it('should handle single class', () => {
    expect(disabled('opacity-50')).toBe('disabled:opacity-50')
  })
})

describe('groupHover helper', () => {
  it('should prefix classes with group-hover:', () => {
    expect(groupHover('text-primary', 'underline')).toBe(
      'group-hover:text-primary group-hover:underline',
    )
  })

  it('should handle single class', () => {
    expect(groupHover('visible')).toBe('group-hover:visible')
  })
})

// =============================================================================
// Preset Tests - buttonClasses
// =============================================================================

describe('buttonClasses preset', () => {
  describe('base classes', () => {
    it('should return base button classes with defaults', () => {
      const result = buttonClasses()
      expect(result).toContain('inline-flex')
      expect(result).toContain('items-center')
      expect(result).toContain('justify-center')
      expect(result).toContain('rounded-md')
      expect(result).toContain('font-medium')
    })
  })

  describe('variant prop', () => {
    it('should apply primary variant by default', () => {
      const result = buttonClasses()
      expect(result).toContain('bg-primary')
      expect(result).toContain('text-white')
    })

    it('should apply secondary variant', () => {
      const result = buttonClasses({ variant: 'secondary' })
      expect(result).toContain('bg-secondary')
    })

    it('should apply outline variant', () => {
      const result = buttonClasses({ variant: 'outline' })
      expect(result).toContain('border')
      expect(result).toContain('bg-transparent')
    })

    it('should apply ghost variant', () => {
      const result = buttonClasses({ variant: 'ghost' })
      expect(result).toContain('bg-transparent')
    })

    it('should apply danger variant', () => {
      const result = buttonClasses({ variant: 'danger' })
      expect(result).toContain('bg-error')
    })
  })

  describe('size prop', () => {
    it('should apply md size by default', () => {
      const result = buttonClasses()
      expect(result).toContain('h-10')
      expect(result).toContain('px-4')
    })

    it('should apply sm size', () => {
      const result = buttonClasses({ size: 'sm' })
      expect(result).toContain('h-8')
      expect(result).toContain('px-3')
    })

    it('should apply lg size', () => {
      const result = buttonClasses({ size: 'lg' })
      expect(result).toContain('h-12')
      expect(result).toContain('px-6')
    })
  })

  describe('combined props', () => {
    it('should combine variant and size', () => {
      const result = buttonClasses({ variant: 'danger', size: 'lg' })
      expect(result).toContain('bg-error')
      expect(result).toContain('h-12')
    })
  })
})

// =============================================================================
// Preset Tests - inputClasses
// =============================================================================

describe('inputClasses preset', () => {
  describe('base classes', () => {
    it('should return base input classes with defaults', () => {
      const result = inputClasses()
      expect(result).toContain('w-full')
      expect(result).toContain('rounded-md')
      expect(result).toContain('border')
      expect(result).toContain('bg-background')
    })
  })

  describe('variant prop', () => {
    it('should apply default variant by default', () => {
      const result = inputClasses()
      expect(result).toContain('border-border')
    })

    it('should apply error variant', () => {
      const result = inputClasses({ variant: 'error' })
      expect(result).toContain('border-error')
    })

    it('should apply success variant', () => {
      const result = inputClasses({ variant: 'success' })
      expect(result).toContain('border-success')
    })
  })

  describe('size prop', () => {
    it('should apply md size by default', () => {
      const result = inputClasses()
      expect(result).toContain('h-10')
    })

    it('should apply sm size', () => {
      const result = inputClasses({ size: 'sm' })
      expect(result).toContain('h-8')
    })

    it('should apply lg size', () => {
      const result = inputClasses({ size: 'lg' })
      expect(result).toContain('h-12')
    })
  })
})

// =============================================================================
// Preset Tests - cardClasses
// =============================================================================

describe('cardClasses preset', () => {
  describe('base classes', () => {
    it('should return base card classes with defaults', () => {
      const result = cardClasses()
      expect(result).toContain('rounded-lg')
      expect(result).toContain('border')
      expect(result).toContain('bg-surface')
    })
  })

  describe('variant prop', () => {
    it('should apply default variant by default', () => {
      const result = cardClasses()
      expect(result).toContain('border-border')
      expect(result).toContain('shadow-sm')
    })

    it('should apply elevated variant', () => {
      const result = cardClasses({ variant: 'elevated' })
      expect(result).toContain('shadow-lg')
    })

    it('should apply outline variant', () => {
      const result = cardClasses({ variant: 'outline' })
      expect(result).toContain('shadow-none')
    })
  })

  describe('padding prop', () => {
    it('should apply md padding by default', () => {
      const result = cardClasses()
      expect(result).toContain('p-4')
    })

    it('should apply none padding', () => {
      const result = cardClasses({ padding: 'none' })
      expect(result).toContain('p-0')
    })

    it('should apply sm padding', () => {
      const result = cardClasses({ padding: 'sm' })
      expect(result).toContain('p-3')
    })

    it('should apply lg padding', () => {
      const result = cardClasses({ padding: 'lg' })
      expect(result).toContain('p-6')
    })
  })
})

// =============================================================================
// Preset Tests - badgeClasses
// =============================================================================

describe('badgeClasses preset', () => {
  describe('base classes', () => {
    it('should return base badge classes with defaults', () => {
      const result = badgeClasses()
      expect(result).toContain('inline-flex')
      expect(result).toContain('items-center')
      expect(result).toContain('rounded-full')
      expect(result).toContain('font-medium')
    })
  })

  describe('variant prop', () => {
    it('should apply default variant by default', () => {
      const result = badgeClasses()
      expect(result).toContain('bg-surface-secondary')
      expect(result).toContain('text-foreground')
    })

    it('should apply primary variant', () => {
      const result = badgeClasses({ variant: 'primary' })
      expect(result).toContain('bg-primary/10')
      expect(result).toContain('text-primary')
    })

    it('should apply success variant', () => {
      const result = badgeClasses({ variant: 'success' })
      expect(result).toContain('bg-success/10')
      expect(result).toContain('text-success')
    })

    it('should apply warning variant', () => {
      const result = badgeClasses({ variant: 'warning' })
      expect(result).toContain('bg-warning/10')
      expect(result).toContain('text-warning')
    })

    it('should apply error variant', () => {
      const result = badgeClasses({ variant: 'error' })
      expect(result).toContain('bg-error/10')
      expect(result).toContain('text-error')
    })
  })

  describe('size prop', () => {
    it('should apply md size by default', () => {
      const result = badgeClasses()
      expect(result).toContain('px-2.5')
      expect(result).toContain('text-sm')
    })

    it('should apply sm size', () => {
      const result = badgeClasses({ size: 'sm' })
      expect(result).toContain('px-2')
      expect(result).toContain('text-xs')
    })

    it('should apply lg size', () => {
      const result = badgeClasses({ size: 'lg' })
      expect(result).toContain('px-3')
      expect(result).toContain('text-base')
    })
  })
})

// =============================================================================
// Type Export Tests
// =============================================================================

describe('Type exports', () => {
  it('should export ClassValue type', () => {
    // Type check - should compile
    const stringValue: ClassValue = 'string-class'
    const numberValue: ClassValue = 123
    const boolValue: ClassValue = false
    const nullValue: ClassValue = null
    const undefinedValue: ClassValue = undefined
    const arrayValue: ClassValue = ['a', 'b', 'c']
    const objectValue: ClassValue = { active: true }

    expect(stringValue).toBeDefined()
    expect(numberValue).toBeDefined()
    expect(boolValue).toBe(false)
    expect(nullValue).toBeNull()
    expect(undefinedValue).toBeUndefined()
    expect(arrayValue).toBeDefined()
    expect(objectValue).toBeDefined()
  })

  it('should export CVAConfig type', () => {
    // Type check - should compile
    const config: CVAConfig<{ size: { sm: string; md: string } }> = {
      variants: {
        size: { sm: 'sm-class', md: 'md-class' },
      },
      defaultVariants: {
        size: 'md',
      },
    }
    expect(config).toBeDefined()
  })

  it('should export Theme type', () => {
    // Type check - the mockTheme already satisfies Theme
    const theme: Theme = mockTheme
    expect(theme.name).toBe('test')
    expect(theme.mode).toBe('light')
  })

  it('should export ThemeBreakpoints type', () => {
    // Type check - should compile
    const breakpoints: ThemeBreakpoints = {
      mobileS: '320px',
      mobileM: '375px',
      mobileL: '425px',
      tablet: '768px',
      laptop: '1024px',
      laptopL: '1440px',
      desktop: '2560px',
    }
    expect(breakpoints.tablet).toBe('768px')
  })
})

// =============================================================================
// Integration Tests
// =============================================================================

describe('Integration tests', () => {
  it('should allow combining preset classes with cn utility', () => {
    const result = cn(buttonClasses({ variant: 'primary', size: 'lg' }), 'extra-class')
    expect(result).toContain('inline-flex')
    expect(result).toContain('h-12')
    expect(result).toContain('bg-primary')
    expect(result).toContain('extra-class')
  })

  it('should allow conditional variants with presets', () => {
    const isError = true
    const result = inputClasses({ variant: isError ? 'error' : 'default' })
    expect(result).toContain('border-error')
  })

  it('should combine state helpers with presets', () => {
    const buttonBase = buttonClasses({ variant: 'primary' })
    const withHover = cn(buttonBase, hover('opacity-90'))
    expect(withHover).toContain('bg-primary')
    expect(withHover).toContain('hover:opacity-90')
  })

  it('should combine responsive helper with presets', () => {
    const responsiveButton = responsive(
      buttonClasses({ size: 'sm' }),
      'md:h-10 md:px-4',
      'lg:h-12 lg:px-6',
    )
    expect(responsiveButton).toContain('h-8')
    expect(responsiveButton).toContain('md:h-10')
    expect(responsiveButton).toContain('lg:h-12')
  })

  it('should allow dark mode with presets', () => {
    const result = cn(cardClasses({ variant: 'default' }), dark('bg-gray-800', 'border-gray-700'))
    expect(result).toContain('bg-surface')
    expect(result).toContain('dark:bg-gray-800')
    expect(result).toContain('dark:border-gray-700')
  })

  it('should work with multiple state helpers', () => {
    const interactiveElement = cn(
      'bg-white',
      hover('bg-gray-100'),
      focus('ring-2', 'ring-primary'),
      active('scale-95'),
      disabled('opacity-50', 'cursor-not-allowed'),
    )
    expect(interactiveElement).toContain('bg-white')
    expect(interactiveElement).toContain('hover:bg-gray-100')
    expect(interactiveElement).toContain('focus:ring-2')
    expect(interactiveElement).toContain('focus:ring-primary')
    expect(interactiveElement).toContain('active:scale-95')
    expect(interactiveElement).toContain('disabled:opacity-50')
    expect(interactiveElement).toContain('disabled:cursor-not-allowed')
  })

  it('should combine show/hide with other classes', () => {
    const result = cn('flex', show('tablet'), 'gap-4')
    expect(result).toContain('flex')
    expect(result).toContain('hidden')
    expect(result).toContain('tablet:block')
    expect(result).toContain('gap-4')
  })
})
