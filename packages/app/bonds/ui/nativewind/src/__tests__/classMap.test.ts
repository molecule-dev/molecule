import { describe, expect, it } from 'vitest'

import type { UIClassMap } from '@molecule/app-ui'

import { classMap } from '../classMap.js'

describe('@molecule/app-ui-nativewind classMap', () => {
  it('should implement UIClassMap interface', () => {
    const cm: UIClassMap = classMap
    expect(cm).toBeDefined()
  })

  // =================================================================
  // cn()
  // =================================================================

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

  // =================================================================
  // grid() — flexbox-based, not CSS grid
  // =================================================================

  describe('grid()', () => {
    it('should return flexbox-based classes instead of CSS grid', () => {
      const result = classMap.grid()
      expect(result).toContain('flex')
      expect(result).toContain('flex-row')
      expect(result).toContain('flex-wrap')
      expect(result).not.toContain('grid')
    })

    it('should default to gap-4', () => {
      const result = classMap.grid()
      expect(result).toContain('gap-4')
    })

    it('should map gap sizes', () => {
      expect(classMap.grid({ gap: 'none' })).toContain('gap-0')
      expect(classMap.grid({ gap: 'xs' })).toContain('gap-1')
      expect(classMap.grid({ gap: 'sm' })).toContain('gap-2')
      expect(classMap.grid({ gap: 'md' })).toContain('gap-4')
      expect(classMap.grid({ gap: 'lg' })).toContain('gap-6')
      expect(classMap.grid({ gap: 'xl' })).toContain('gap-8')
    })

    it('should fall back to gap-4 for unknown gap values', () => {
      // When cols is passed but gap is not, default gap-4
      const result = classMap.grid({ cols: 3 })
      expect(result).toContain('gap-4')
    })
  })

  // =================================================================
  // container() — simple padding for mobile
  // =================================================================

  describe('container()', () => {
    it('should return mobile-friendly container classes', () => {
      const result = classMap.container()
      expect(result).toContain('w-full')
      expect(result).toContain('px-4')
    })

    it('should default to xl size', () => {
      const result = classMap.container()
      // xl maps to 'w-full px-4'
      expect(result).toBe('w-full px-4')
    })

    it('should map size variants', () => {
      expect(classMap.container({ size: 'sm' })).toBe('w-full px-4')
      expect(classMap.container({ size: 'md' })).toBe('w-full px-4')
      expect(classMap.container({ size: 'lg' })).toBe('w-full px-4')
      expect(classMap.container({ size: 'xl' })).toBe('w-full px-4')
      expect(classMap.container({ size: '2xl' })).toBe('w-full px-4')
      expect(classMap.container({ size: 'full' })).toBe('w-full')
    })

    it('should not contain mx-auto (no responsive centering on RN)', () => {
      const result = classMap.container()
      expect(result).not.toContain('mx-auto')
    })
  })

  // =================================================================
  // modal() — RN-compatible, no fixed positioning or backdrop-blur
  // =================================================================

  describe('modal()', () => {
    it('should return modal classes', () => {
      const result = classMap.modal()
      expect(result).toBeTruthy()
      expect(result).toContain('bg-surface')
    })

    it('should default to md size', () => {
      const result = classMap.modal()
      expect(result).toContain('max-w-md')
    })

    it('should map size variants', () => {
      expect(classMap.modal({ size: 'sm' })).toContain('max-w-sm')
      expect(classMap.modal({ size: 'md' })).toContain('max-w-md')
      expect(classMap.modal({ size: 'lg' })).toContain('max-w-lg')
      expect(classMap.modal({ size: 'xl' })).toContain('max-w-xl')
      expect(classMap.modal({ size: 'full' })).toContain('w-full')
      expect(classMap.modal({ size: 'full' })).toContain('h-full')
    })

    it('should not contain fixed positioning', () => {
      const result = classMap.modal()
      expect(result).not.toContain('fixed')
    })

    it('should not contain backdrop-blur', () => {
      const result = classMap.modal()
      expect(result).not.toContain('backdrop-blur')
    })
  })

  // =================================================================
  // toastContainer() — absolute instead of fixed
  // =================================================================

  describe('toastContainer()', () => {
    it('should use absolute positioning instead of fixed', () => {
      const result = classMap.toastContainer()
      expect(result).toContain('absolute')
      expect(result).not.toContain('fixed')
    })

    it('should default to bottom-right', () => {
      const result = classMap.toastContainer()
      expect(result).toContain('bottom-0')
      expect(result).toContain('right-0')
    })

    it('should map position variants', () => {
      expect(classMap.toastContainer({ position: 'top' })).toContain('top-0')
      expect(classMap.toastContainer({ position: 'top-right' })).toContain('top-0')
      expect(classMap.toastContainer({ position: 'top-right' })).toContain('right-0')
      expect(classMap.toastContainer({ position: 'top-left' })).toContain('top-0')
      expect(classMap.toastContainer({ position: 'top-left' })).toContain('left-0')
      expect(classMap.toastContainer({ position: 'bottom' })).toContain('bottom-0')
      expect(classMap.toastContainer({ position: 'bottom-right' })).toContain('bottom-0')
      expect(classMap.toastContainer({ position: 'bottom-left' })).toContain('bottom-0')
      expect(classMap.toastContainer({ position: 'bottom-left' })).toContain('left-0')
    })
  })

  // =================================================================
  // spacer() — RN-compatible, no inline-block
  // =================================================================

  describe('spacer()', () => {
    it('should return height-based spacer by default', () => {
      const result = classMap.spacer()
      expect(result).toContain('h-')
    })

    it('should return width-based spacer when horizontal', () => {
      const result = classMap.spacer({ horizontal: true })
      expect(result).toContain('w-')
    })

    it('should not contain inline-block (not supported in RN)', () => {
      const result = classMap.spacer()
      expect(result).not.toContain('inline-block')
      const horiz = classMap.spacer({ horizontal: true })
      expect(horiz).not.toContain('inline-block')
    })

    it('should map size values', () => {
      expect(classMap.spacer({ size: 'xs' })).toBe('h-1')
      expect(classMap.spacer({ size: 'sm' })).toBe('h-2')
      expect(classMap.spacer({ size: 'md' })).toBe('h-4')
      expect(classMap.spacer({ size: 'lg' })).toBe('h-6')
      expect(classMap.spacer({ size: 'xl' })).toBe('h-8')
    })

    it('should map horizontal size values', () => {
      expect(classMap.spacer({ size: 'xs', horizontal: true })).toBe('w-1')
      expect(classMap.spacer({ size: 'sm', horizontal: true })).toBe('w-2')
      expect(classMap.spacer({ size: 'md', horizontal: true })).toBe('w-4')
      expect(classMap.spacer({ size: 'lg', horizontal: true })).toBe('w-6')
      expect(classMap.spacer({ size: 'xl', horizontal: true })).toBe('w-8')
    })
  })

  // =================================================================
  // flex() — defaults to column direction (RN default)
  // =================================================================

  describe('flex()', () => {
    it('should return flex classes', () => {
      const result = classMap.flex()
      expect(result).toContain('flex')
    })

    it('should default to column direction (RN convention)', () => {
      const result = classMap.flex()
      expect(result).toContain('flex-col')
    })

    it('should respect explicit direction override', () => {
      const result = classMap.flex({ direction: 'row' })
      expect(result).toContain('flex-row')
    })

    it('should map flex options', () => {
      const result = classMap.flex({
        direction: 'row',
        align: 'center',
        justify: 'between',
        gap: 'md',
      })
      expect(result).toContain('flex-row')
      expect(result).toContain('items-center')
      expect(result).toContain('justify-between')
      expect(result).toContain('gap-4')
    })
  })

  // =================================================================
  // gridRows() — not supported, returns empty string
  // =================================================================

  describe('gridRows()', () => {
    it('should return empty string (CSS grid not supported in RN)', () => {
      expect(classMap.gridRows(3)).toBe('')
      expect(classMap.gridRows(1)).toBe('')
      expect(classMap.gridRows(12)).toBe('')
    })
  })

  // =================================================================
  // position() — maps fixed/sticky to absolute
  // =================================================================

  describe('position()', () => {
    it('should return "relative" as-is', () => {
      expect(classMap.position('relative')).toBe('relative')
    })

    it('should return "absolute" as-is', () => {
      expect(classMap.position('absolute')).toBe('absolute')
    })

    it('should map "fixed" to "absolute" (RN has no fixed)', () => {
      expect(classMap.position('fixed')).toBe('absolute')
    })

    it('should map "sticky" to "absolute" (RN has no sticky)', () => {
      expect(classMap.position('sticky')).toBe('absolute')
    })
  })

  // =================================================================
  // hover: → active: replacements (touch devices)
  // =================================================================

  describe('hover to active replacements', () => {
    it('should use active: instead of hover: for link', () => {
      expect(classMap.link).toContain('active:')
      expect(classMap.link).not.toContain('hover:')
    })

    it('should use active: instead of hover: for tableRowHoverable', () => {
      expect(classMap.tableRowHoverable).toContain('active:')
      expect(classMap.tableRowHoverable).not.toContain('hover:')
    })

    it('should have empty cursorPointer (not meaningful on touch devices)', () => {
      expect(classMap.cursorPointer).toBe('')
    })
  })

  // =================================================================
  // Static RN overrides — fixed → absolute, unsupported → empty
  // =================================================================

  describe('static RN overrides', () => {
    it('page should use flex-1 and bg-background', () => {
      expect(classMap.page).toContain('flex-1')
      expect(classMap.page).toContain('bg-background')
      expect(classMap.page).not.toContain('min-h-screen')
    })

    it('headerFixed should use absolute instead of fixed', () => {
      expect(classMap.headerFixed).toContain('absolute')
      expect(classMap.headerFixed).not.toContain('fixed')
    })

    it('overlay should use absolute instead of fixed', () => {
      expect(classMap.overlay).toContain('absolute')
      expect(classMap.overlay).not.toContain('fixed')
    })

    it('drawer should use absolute instead of fixed', () => {
      expect(classMap.drawer).toContain('absolute')
      expect(classMap.drawer).not.toContain('fixed')
    })

    it('footerBar should use absolute instead of fixed', () => {
      expect(classMap.footerBar).toContain('absolute')
      expect(classMap.footerBar).not.toContain('fixed')
    })

    it('dialogOverlay should use absolute instead of fixed', () => {
      expect(classMap.dialogOverlay).toContain('absolute')
      expect(classMap.dialogOverlay).not.toContain('fixed')
    })

    it('dialogWrapper should use absolute instead of fixed', () => {
      expect(classMap.dialogWrapper).toContain('absolute')
      expect(classMap.dialogWrapper).not.toContain('fixed')
    })

    it('actionSheet should use absolute positioning', () => {
      expect(classMap.actionSheet).toContain('absolute')
      expect(classMap.actionSheet).toContain('bottom-0')
    })

    it('actionSheetHeader should have padding and border', () => {
      expect(classMap.actionSheetHeader).toContain('p-4')
      expect(classMap.actionSheetHeader).toContain('border-b')
    })

    it('inset0 should use absolute with explicit edges', () => {
      expect(classMap.inset0).toContain('absolute')
      expect(classMap.inset0).toContain('top-0')
      expect(classMap.inset0).toContain('right-0')
      expect(classMap.inset0).toContain('bottom-0')
      expect(classMap.inset0).toContain('left-0')
    })
  })

  // =================================================================
  // Display utilities — empty on RN
  // =================================================================

  describe('display utilities (unsupported in RN)', () => {
    it('displayBlock should be empty', () => {
      expect(classMap.displayBlock).toBe('')
    })

    it('displayInlineBlock should be empty', () => {
      expect(classMap.displayInlineBlock).toBe('')
    })

    it('displayContents should be empty', () => {
      expect(classMap.displayContents).toBe('')
    })

    it('prose should be empty (typography plugin not supported)', () => {
      expect(classMap.prose).toBe('')
    })
  })

  // =================================================================
  // Inherited methods from tailwind classMap (should still work)
  // =================================================================

  describe('inherited tailwind methods', () => {
    describe('button()', () => {
      it('should return classes with default options', () => {
        const result = classMap.button()
        expect(result).toBeTruthy()
        expect(typeof result).toBe('string')
      })

      it('should map variant "solid" to primary', () => {
        const result = classMap.button({ variant: 'solid' })
        expect(result).toContain('bg-primary')
      })

      it('should map variant "outline"', () => {
        const result = classMap.button({ variant: 'outline' })
        expect(result).toContain('border')
      })

      it('should map size "xs"', () => {
        const result = classMap.button({ size: 'xs' })
        expect(result).toBeTruthy()
      })

      it('should map size "xl"', () => {
        const result = classMap.button({ size: 'xl' })
        expect(result).toBeTruthy()
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

      it('should return error variant', () => {
        const result = classMap.input({ error: true })
        expect(result).toContain('border-b-error')
      })
    })

    describe('card()', () => {
      it('should return default card classes', () => {
        const result = classMap.card()
        expect(result).toContain('rounded-lg')
      })
    })

    describe('badge()', () => {
      it('should return default badge classes', () => {
        expect(classMap.badge()).toBeTruthy()
      })
    })

    describe('spinner()', () => {
      it('should return spinner classes', () => {
        expect(classMap.spinner()).toContain('animate-spin')
      })

      it('should map sizes', () => {
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

    describe('avatar()', () => {
      it('should return avatar classes', () => {
        expect(classMap.avatar()).toContain('rounded-full')
      })

      it('should map sizes', () => {
        const sm = classMap.avatar({ size: 'xs' })
        const xl = classMap.avatar({ size: 'xl' })
        expect(sm).toContain('h-8')
        expect(xl).toContain('h-16')
      })
    })
  })

  // =================================================================
  // All UIClassMap properties are implemented
  // =================================================================

  describe('all UIClassMap properties are implemented', () => {
    it('should have no undefined properties', () => {
      const entries = Object.entries(classMap)
      for (const [key, value] of entries) {
        expect(value, `${key} should not be undefined`).not.toBeUndefined()
      }
    })
  })

  // =================================================================
  // Static class strings inherited from tailwind
  // =================================================================

  describe('static class strings', () => {
    const nonEmptyStaticProps: (keyof UIClassMap)[] = [
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

    for (const prop of nonEmptyStaticProps) {
      it(`should have non-empty "${prop}" string`, () => {
        const value = classMap[prop]
        expect(typeof value).toBe('string')
        expect(value as string).toBeTruthy()
      })
    }
  })
})
