import { describe, expect, it } from 'vitest'

import { themeToCSS } from '../theme.js'
import { camelToKebab, cn, cva } from '../utilities.js'

describe('@molecule/app-styling', () => {
  describe('cn', () => {
    it('should join class names', () => {
      expect(cn('a', 'b', 'c')).toBe('a b c')
    })

    it('should filter out falsy values', () => {
      expect(cn('a', false, null, undefined, '', 'b')).toBe('a b')
    })

    it('should flatten arrays', () => {
      expect(cn('a', ['b', 'c'])).toBe('a b c')
    })

    it('should handle objects (truthy keys)', () => {
      expect(cn({ active: true, disabled: false, visible: true })).toBe('active visible')
    })

    it('should mix strings, arrays, and objects', () => {
      expect(cn('base', ['extra'], { conditional: true })).toBe('base extra conditional')
    })

    it('should return empty string for no classes', () => {
      expect(cn()).toBe('')
    })

    it('should return empty string for all falsy', () => {
      expect(cn(false, null, undefined, '')).toBe('')
    })

    it('should handle numbers', () => {
      expect(cn('text', 0)).toBe('text 0')
    })
  })

  describe('cva', () => {
    it('should return base class when no variants', () => {
      const button = cva('btn')
      expect(button()).toBe('btn')
    })

    it('should apply variant classes', () => {
      const button = cva('btn', {
        variants: {
          size: { sm: 'btn-sm', md: 'btn-md', lg: 'btn-lg' },
        },
      })

      expect(button({ size: 'lg' })).toBe('btn btn-lg')
    })

    it('should apply default variants', () => {
      const button = cva('btn', {
        variants: {
          size: { sm: 'btn-sm', md: 'btn-md', lg: 'btn-lg' },
        },
        defaultVariants: { size: 'md' },
      })

      expect(button()).toBe('btn btn-md')
    })

    it('should override default variants with explicit props', () => {
      const button = cva('btn', {
        variants: {
          size: { sm: 'btn-sm', md: 'btn-md', lg: 'btn-lg' },
        },
        defaultVariants: { size: 'md' },
      })

      expect(button({ size: 'lg' })).toBe('btn btn-lg')
    })

    it('should handle multiple variant groups', () => {
      const button = cva('btn', {
        variants: {
          size: { sm: 'btn-sm', lg: 'btn-lg' },
          color: { primary: 'btn-primary', danger: 'btn-danger' },
        },
      })

      expect(button({ size: 'lg', color: 'danger' })).toBe('btn btn-lg btn-danger')
    })

    it('should apply compound variants', () => {
      const button = cva('btn', {
        variants: {
          size: { sm: 'btn-sm', lg: 'btn-lg' },
          color: { primary: 'btn-primary', danger: 'btn-danger' },
        },
        compoundVariants: [{ size: 'lg', color: 'danger', class: 'btn-lg-danger' }],
      })

      expect(button({ size: 'lg', color: 'danger' })).toBe('btn btn-lg btn-danger btn-lg-danger')
    })

    it('should not apply compound variants when conditions do not match', () => {
      const button = cva('btn', {
        variants: {
          size: { sm: 'btn-sm', lg: 'btn-lg' },
          color: { primary: 'btn-primary', danger: 'btn-danger' },
        },
        compoundVariants: [{ size: 'lg', color: 'danger', class: 'btn-lg-danger' }],
      })

      expect(button({ size: 'sm', color: 'primary' })).toBe('btn btn-sm btn-primary')
    })

    it('should apply compound variants with default variants when props provided', () => {
      const button = cva('btn', {
        variants: {
          size: { sm: 'btn-sm', lg: 'btn-lg' },
          color: { primary: 'btn-primary', danger: 'btn-danger' },
        },
        defaultVariants: { size: 'lg', color: 'danger' },
        compoundVariants: [{ size: 'lg', color: 'danger', class: 'btn-lg-danger' }],
      })

      // Compound variants require props object (even empty) to be checked
      expect(button({})).toBe('btn btn-lg btn-danger btn-lg-danger')
    })

    it('should append custom class prop', () => {
      const button = cva('btn')
      expect(button({ class: 'extra' })).toBe('btn extra')
    })
  })

  describe('camelToKebab', () => {
    it('should convert camelCase to kebab-case', () => {
      expect(camelToKebab('backgroundColor')).toBe('background-color')
    })

    it('should handle single word', () => {
      expect(camelToKebab('color')).toBe('color')
    })

    it('should handle multiple capitals', () => {
      expect(camelToKebab('borderTopLeftRadius')).toBe('border-top-left-radius')
    })

    it('should handle already kebab-case', () => {
      expect(camelToKebab('already-kebab')).toBe('already-kebab')
    })
  })

  describe('themeToCSS', () => {
    it('should convert theme to CSS custom properties', () => {
      const theme = {
        colors: { primary: '#ff0000', textMuted: '#666' },
        spacing: { sm: '0.5rem', md: '1rem' },
        typography: { fontSize: { base: '1rem', lg: '1.25rem' } },
        borderRadius: { sm: '0.25rem', full: '9999px' },
        shadows: { sm: '0 1px 2px rgba(0,0,0,0.1)' },
      }

      const vars = themeToCSS(theme)

      expect(vars['--color-primary']).toBe('#ff0000')
      expect(vars['--color-text-muted']).toBe('#666')
      expect(vars['--spacing-sm']).toBe('0.5rem')
      expect(vars['--spacing-md']).toBe('1rem')
      expect(vars['--font-size-base']).toBe('1rem')
      expect(vars['--font-size-lg']).toBe('1.25rem')
      expect(vars['--radius-sm']).toBe('0.25rem')
      expect(vars['--radius-full']).toBe('9999px')
      expect(vars['--shadow-sm']).toBe('0 1px 2px rgba(0,0,0,0.1)')
    })

    it('should stringify numeric values', () => {
      const theme = {
        colors: {},
        spacing: { base: 16 },
        typography: { fontSize: {} },
        borderRadius: {},
        shadows: {},
      }

      const vars = themeToCSS(theme)

      expect(vars['--spacing-base']).toBe('16')
    })

    it('should handle empty theme sections', () => {
      const theme = {
        colors: {},
        spacing: {},
        typography: { fontSize: {} },
        borderRadius: {},
        shadows: {},
      }

      const vars = themeToCSS(theme)

      expect(Object.keys(vars)).toHaveLength(0)
    })
  })
})
