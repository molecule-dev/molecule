import { describe, expect, it } from 'vitest'

import type { UIClassMap } from '@molecule/app-ui'

import { classMap } from '../classMap.js'

describe('classMap', () => {
  it('should implement UIClassMap interface', () => {
    const cm: UIClassMap = classMap
    expect(cm).toBeDefined()
  })

  describe('cn()', () => {
    it('should merge class strings', () => {
      const result = classMap.cn('foo', 'bar')
      expect(result).toContain('foo')
      expect(result).toContain('bar')
    })

    it('should filter falsy values', () => {
      const result = classMap.cn('foo', false, null, undefined, 'bar')
      expect(result).toBe('foo bar')
    })

    it('should handle empty call', () => {
      const result = classMap.cn()
      expect(result).toBe('')
    })
  })

  describe('button()', () => {
    it('should return classes with default options', () => {
      const result = classMap.button()
      expect(result).toBeTruthy()
      expect(typeof result).toBe('string')
    })

    it('should map generic variant "solid" to Tailwind default', () => {
      const result = classMap.button({ variant: 'solid' })
      expect(result).toContain('bg-primary')
    })

    it('should map variant "outline" to border styles', () => {
      const result = classMap.button({ variant: 'outline' })
      expect(result).toContain('border')
    })

    it('should map variant "ghost"', () => {
      const result = classMap.button({ variant: 'ghost' })
      expect(result).toContain('hover:bg-surface-secondary')
    })

    it('should map variant "link"', () => {
      const result = classMap.button({ variant: 'link' })
      expect(result).toContain('underline')
    })

    it('should map color "error" to danger variant', () => {
      const result = classMap.button({ color: 'error' })
      expect(result).toContain('bg-error')
    })

    it('should map color "secondary"', () => {
      const result = classMap.button({ color: 'secondary' })
      expect(result).toContain('bg-secondary')
    })

    it('should color override variant', () => {
      const result = classMap.button({ variant: 'solid', color: 'error' })
      expect(result).toContain('bg-error')
    })

    it('should map size "xs" to small', () => {
      const result = classMap.button({ size: 'xs' })
      expect(result).toContain('h-[26px]')
    })

    it('should map size "xl" to large', () => {
      const result = classMap.button({ size: 'xl' })
      expect(result).toContain('h-10')
    })

    it('should add w-full when fullWidth is true', () => {
      const result = classMap.button({ fullWidth: true })
      expect(result).toContain('w-full')
    })
  })

  describe('input()', () => {
    it('should return default input classes', () => {
      const result = classMap.input()
      expect(result).toContain('border')
    })

    it('should return error variant when error is true', () => {
      const result = classMap.input({ error: true })
      expect(result).toContain('border-b-error')
    })

    it('should map size', () => {
      const sm = classMap.input({ size: 'xs' })
      const lg = classMap.input({ size: 'xl' })
      expect(sm).toContain('h-[35px]')
      expect(lg).toContain('h-[55px]')
    })
  })

  describe('textarea()', () => {
    it('should return default textarea classes', () => {
      const result = classMap.textarea()
      expect(result).toBeTruthy()
    })

    it('should return error variant', () => {
      const result = classMap.textarea({ error: true })
      expect(result).toContain('border-b-error')
    })
  })

  describe('select()', () => {
    it('should return default select classes', () => {
      const result = classMap.select()
      expect(result).toBeTruthy()
    })

    it('should return error variant', () => {
      const result = classMap.select({ error: true })
      expect(result).toContain('border-b-error')
    })
  })

  describe('checkbox()', () => {
    it('should return default checkbox classes', () => {
      const result = classMap.checkbox()
      expect(result).toBeTruthy()
    })

    it('should return error variant', () => {
      const result = classMap.checkbox({ error: true })
      expect(result).toContain('border-error')
    })
  })

  describe('radio()', () => {
    it('should return default radio classes', () => {
      const result = classMap.radio()
      expect(result).toBeTruthy()
    })

    it('should return error variant', () => {
      const result = classMap.radio({ error: true })
      expect(result).toContain('border-error')
    })
  })

  describe('switchBase() / switchThumb()', () => {
    it('should return switch base classes', () => {
      expect(classMap.switchBase()).toBeTruthy()
    })

    it('should return switch thumb classes', () => {
      expect(classMap.switchThumb()).toBeTruthy()
    })

    it('should map size for switch', () => {
      const sm = classMap.switchBase({ size: 'sm' })
      const lg = classMap.switchBase({ size: 'lg' })
      expect(sm).toContain('h-5')
      expect(lg).toContain('h-7')
    })
  })

  describe('label()', () => {
    it('should return label classes', () => {
      expect(classMap.label()).toBeTruthy()
    })

    it('should add required indicator', () => {
      const result = classMap.label({ required: true })
      expect(result).toContain("after:content-['*']")
    })
  })

  describe('card()', () => {
    it('should return default card classes', () => {
      const result = classMap.card()
      expect(result).toContain('rounded-lg')
    })

    it('should map variant "elevated"', () => {
      const result = classMap.card({ variant: 'elevated' })
      expect(result).toContain('shadow-lg')
    })

    it('should map variant "ghost"', () => {
      const result = classMap.card({ variant: 'ghost' })
      expect(result).toContain('bg-transparent')
    })
  })

  describe('badge()', () => {
    it('should return default badge classes', () => {
      expect(classMap.badge()).toBeTruthy()
    })

    it('should map color "success"', () => {
      const result = classMap.badge({ variant: 'success' })
      expect(result).toContain('bg-success')
    })

    it('should map color "error"', () => {
      const result = classMap.badge({ variant: 'error' })
      expect(result).toContain('bg-error')
    })
  })

  describe('alert()', () => {
    it('should return default alert classes', () => {
      expect(classMap.alert()).toBeTruthy()
    })

    it('should map variant "error"', () => {
      const result = classMap.alert({ variant: 'error' })
      expect(result).toContain('bg-error-light')
    })

    it('should map variant "success"', () => {
      const result = classMap.alert({ variant: 'success' })
      expect(result).toContain('bg-success-light')
    })
  })

  describe('avatar()', () => {
    it('should return default avatar classes', () => {
      expect(classMap.avatar()).toContain('rounded-full')
    })

    it('should map 4-tier sizes', () => {
      const sm = classMap.avatar({ size: 'xs' })
      const xl = classMap.avatar({ size: 'xl' })
      expect(sm).toContain('h-8')
      expect(xl).toContain('h-16')
    })
  })

  describe('modal()', () => {
    it('should return modal classes', () => {
      expect(classMap.modal()).toBeTruthy()
    })

    it('should map size', () => {
      const sm = classMap.modal({ size: 'sm' })
      const lg = classMap.modal({ size: 'lg' })
      expect(sm).toContain('max-w-sm')
      expect(lg).toContain('max-w-2xl')
    })
  })

  describe('spinner()', () => {
    it('should return spinner classes', () => {
      expect(classMap.spinner()).toContain('animate-spin')
    })

    it('should map 4-tier sizes', () => {
      const sm = classMap.spinner({ size: 'sm' })
      const xl = classMap.spinner({ size: 'xl' })
      expect(sm).toContain('h-4')
      expect(xl).toContain('h-12')
    })
  })

  describe('toast()', () => {
    it('should return default toast classes', () => {
      expect(classMap.toast()).toBeTruthy()
    })

    it('should map variant "error"', () => {
      const result = classMap.toast({ variant: 'error' })
      expect(result).toContain('border-error')
    })
  })

  describe('separator()', () => {
    it('should return horizontal separator by default', () => {
      const result = classMap.separator()
      expect(result).toContain('w-full')
    })

    it('should return vertical separator', () => {
      const result = classMap.separator({ orientation: 'vertical' })
      expect(result).toContain('h-full')
    })
  })

  describe('accordion()', () => {
    it('should return accordion trigger classes', () => {
      expect(classMap.accordion()).toBeTruthy()
    })
  })

  describe('pagination()', () => {
    it('should return default pagination classes', () => {
      expect(classMap.pagination()).toBeTruthy()
    })

    it('should return active variant', () => {
      const result = classMap.pagination({ active: true })
      expect(result).toContain('border')
    })
  })

  describe('static resolvers', () => {
    it('should return tooltip classes', () => {
      expect(classMap.tooltip()).toBeTruthy()
    })

    it('should return progress classes', () => {
      expect(classMap.progress()).toContain('overflow-hidden')
    })

    it('should return progressBar classes', () => {
      expect(classMap.progressBar()).toContain('bg-primary')
    })

    it('should return skeleton classes', () => {
      expect(classMap.skeleton()).toContain('animate-pulse')
    })
  })

  describe('layout resolvers', () => {
    it('should return container classes', () => {
      expect(classMap.container()).toContain('mx-auto')
    })

    it('should return flex classes', () => {
      expect(classMap.flex()).toContain('flex')
    })

    it('should return grid classes', () => {
      expect(classMap.grid()).toContain('grid')
    })

    it('should map flex options', () => {
      const result = classMap.flex({
        direction: 'col',
        align: 'center',
        justify: 'between',
        gap: 'md',
      })
      expect(result).toContain('flex-col')
      expect(result).toContain('items-center')
      expect(result).toContain('justify-between')
      expect(result).toContain('gap-4')
    })

    it('should map grid cols', () => {
      const result = classMap.grid({ cols: 3, gap: 'lg' })
      expect(result).toContain('grid-cols-3')
      expect(result).toContain('gap-6')
    })
  })

  describe('static class strings', () => {
    const staticProps: (keyof UIClassMap)[] = [
      'formError',
      'formHint',
      'cardHeader',
      'cardTitle',
      'cardDescription',
      'cardContent',
      'cardFooter',
      'alertTitle',
      'alertDescription',
      'avatarImage',
      'avatarFallback',
      'dialogOverlay',
      'dialogHeader',
      'dialogFooter',
      'dialogTitle',
      'dialogDescription',
      'dialogClose',
      'actionSheet',
      'actionSheetHeader',
      'dropdownContent',
      'dropdownItem',
      'dropdownSeparator',
      'dropdownLabel',
      'table',
      'tableHeader',
      'tableBody',
      'tableFooter',
      'tableRow',
      'tableHead',
      'tableCell',
      'tableCaption',
      'tabsList',
      'tabsTrigger',
      'tabsContent',
      'tooltipContent',
      'toastViewport',
      'toastTitle',
      'toastDescription',
      'toastClose',
      'toastAction',
      'accordionRoot',
      'accordionItem',
      'accordionContent',
      'accordionContentInner',
      'paginationRoot',
      'paginationContent',
      'paginationLink',
      'paginationPrevious',
      'paginationNext',
      'paginationEllipsis',
      'center',
      'srOnly',
      'notSrOnly',
      'surfaceSecondary',
      'textPrimary',
      'textSuccess',
      'textWarning',
      'borderB',
      'borderT',
      'borderR',
      'borderAll',
      'borderBPrimary',
      'bgErrorSubtle',
      'bgBorder',
    ]

    for (const prop of staticProps) {
      it(`should have non-empty "${prop}" string`, () => {
        const value = classMap[prop]
        expect(typeof value).toBe('string')
        expect(value as string).toBeTruthy()
      })
    }
  })

  describe('all UIClassMap properties are implemented', () => {
    it('should have no undefined properties', () => {
      const entries = Object.entries(classMap)
      for (const [key, value] of entries) {
        expect(value, `${key} should not be undefined`).not.toBeUndefined()
      }
    })
  })
})
