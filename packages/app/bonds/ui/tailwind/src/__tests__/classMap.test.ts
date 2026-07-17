import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

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

    it('should map variant "outline" to transparent background', () => {
      const result = classMap.button({ variant: 'outline' })
      expect(result).toContain('bg-transparent')
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

    it('defaults to the primary color, reproducing the exact old hardcoded classes', () => {
      const OLD_SWITCH_BASE =
        'peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-surface-secondary focus-visible:ring-primary h-6 w-11'
      const tokens = (s: string): string[] => s.split(/\s+/).filter(Boolean).sort()
      expect(tokens(classMap.switchBase())).toEqual(tokens(OLD_SWITCH_BASE))
    })

    it('maps every ColorVariant to a distinct switchBase class string', () => {
      const colors = ['primary', 'secondary', 'success', 'warning', 'error', 'info'] as const
      const results = colors.map((color) => classMap.switchBase({ color }))
      expect(new Set(results).size).toBe(colors.length)
      expect(classMap.switchBase({ color: 'success' })).toContain('data-[state=checked]:bg-success')
      expect(classMap.switchBase({ color: 'error' })).toContain('data-[state=checked]:bg-error')
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

  describe('tabsList() / tabsTrigger() / tabsContent()', () => {
    // Order-independent token comparison: Tailwind utility classes don't
    // care about their position within the `class` attribute, only the CVA
    // concatenation order changed (base, then variant, then size) — not the
    // set of classes rendered for the pre-existing (now default) look.
    const tokens = (s: string): string[] => s.split(/\s+/).filter(Boolean).sort()

    it('tabsList() with no options reproduces the exact old hardcoded class SET', () => {
      const OLD_TABS_LIST =
        'inline-flex h-10 items-center justify-center rounded-md bg-surface-secondary p-1 text-foreground-secondary'
      expect(tokens(classMap.tabsList())).toEqual(tokens(OLD_TABS_LIST))
    })

    it('tabsTrigger() with no options reproduces the exact old hardcoded class SET', () => {
      const OLD_TABS_TRIGGER =
        'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm'
      expect(tokens(classMap.tabsTrigger())).toEqual(tokens(OLD_TABS_TRIGGER))
    })

    it('tabsContent() with no options reproduces the exact old hardcoded class SET', () => {
      const OLD_TABS_CONTENT =
        'mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2'
      expect(tokens(classMap.tabsContent())).toEqual(tokens(OLD_TABS_CONTENT))
    })

    it('tabsList differs across the 3 container shapes (soft/solid-rounded share one pill track — only the trigger differs between them)', () => {
      const line = classMap.tabsList({ variant: 'line' })
      const enclosed = classMap.tabsList({ variant: 'enclosed' })
      const softRounded = classMap.tabsList({ variant: 'soft-rounded' })
      const solidRounded = classMap.tabsList({ variant: 'solid-rounded' })
      expect(new Set([line, enclosed, softRounded]).size).toBe(3)
      expect(solidRounded).toBe(softRounded)
    })

    it('every tabsTrigger variant produces a distinct class string, each keying active state off data-[state=active]', () => {
      const variants = ['line', 'enclosed', 'soft-rounded', 'solid-rounded'] as const
      const results = variants.map((variant) => classMap.tabsTrigger({ variant }))
      expect(new Set(results).size).toBe(variants.length)
      for (const result of results) {
        expect(result).toContain('data-[state=active]:')
      }
    })

    it('tabsContent spacing differs across the 3 container shapes (soft/solid-rounded share spacing)', () => {
      const line = classMap.tabsContent({ variant: 'line' })
      const enclosed = classMap.tabsContent({ variant: 'enclosed' })
      const softRounded = classMap.tabsContent({ variant: 'soft-rounded' })
      const solidRounded = classMap.tabsContent({ variant: 'solid-rounded' })
      expect(new Set([line, enclosed, softRounded]).size).toBe(3)
      expect(solidRounded).toBe(softRounded)
    })

    it('tabsList/tabsTrigger size options produce distinct height/padding per size', () => {
      const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const
      const listSizes = new Set(sizes.map((size) => classMap.tabsList({ size })))
      const triggerSizes = new Set(sizes.map((size) => classMap.tabsTrigger({ size })))
      // xs/sm collapse onto the same 3-tier Tailwind size (matching every
      // other resolver's size3Map), so only 3 distinct outputs are expected.
      expect(listSizes.size).toBe(3)
      expect(triggerSizes.size).toBe(3)
      expect(classMap.tabsTrigger({ size: 'lg' })).toContain('text-base')
      expect(classMap.tabsTrigger({ size: 'sm' })).toContain('text-xs')
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

  describe('touchTarget (WCAG 2.5.5)', () => {
    it('enforces a >=44px minimum height and width', () => {
      expect(classMap.touchTarget).toContain('min-h-[44px]')
      expect(classMap.touchTarget).toContain('min-w-[44px]')
    })

    it('scopes the minimum to coarse-pointer (touch) devices only', () => {
      // Every sizing token must carry the `pointer-coarse` variant so a
      // fine-pointer (mouse) desktop layout keeps its compact control sizing.
      for (const cls of classMap.touchTarget.split(/\s+/).filter(Boolean)) {
        expect(cls.startsWith('pointer-coarse:'), `${cls} must be coarse-pointer scoped`).toBe(true)
      }
    })
  })
})

describe('base.css @source inline safelist renders every cm.* dynamic value', () => {
  // cm.sp(side, scale) / cm.stack / cm.textSize / cm.fontWeight and the sizing
  // methods cm.w / cm.h / cm.minH / cm.maxW emit their value DIRECTLY (cm.sp('p',
  // 24) -> "p-24"). A dynamically-built class renders ONLY if Tailwind's JIT sees
  // it — hence the @source inline safelist in base.css. If a value the TYPE admits
  // is missing from the safelist, the call type-checks but renders NOTHING. This
  // compiles the REAL safelist with Tailwind and asserts every class the resolvers
  // can emit actually generates, so the safelist can't silently drift behind the
  // value ranges again. The value lists mirror the unions in @molecule/app-ui;
  // if one is wrong tsc fails here (the resolver args are typed).
  const SPACING = [0, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24] as const
  const TEXT = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl'] as const
  const FONT = ['normal', 'medium', 'semibold', 'bold', 'extrabold'] as const
  const WIDTH = ['full', 'auto', 'screen', 'fit', '1/2', '1/3', '2/3', '1/4', '3/4'] as const
  const HEIGHT = ['full', 'screen', 'auto', '1/2', '1/3', '2/3', '1/4', '3/4'] as const
  const MAXW = [
    'none',
    'xs',
    'sm',
    'md',
    'lg',
    'xl',
    '2xl',
    '3xl',
    '4xl',
    '5xl',
    '6xl',
    '7xl',
    'full',
    'screen-2xl',
  ] as const

  it('every cm.* dynamic class the resolvers emit is generated by the safelist', async () => {
    const dir = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
    const baseCss = readFileSync(join(dir, 'base.css'), 'utf8')
    // Only the @source inline safelist — build([]) below passes NO scanned
    // candidates, so a class that renders came SOLELY from the safelist.
    const safelist = [...baseCss.matchAll(/@source inline\("[^"]*"\);/g)]
      .map((m) => m[0])
      .join('\n')
    const { compile } = await import('@tailwindcss/node')
    const compiler = await compile(`@import "tailwindcss";\n${safelist}`, {
      base: dir,
      onDependency: () => {},
    })
    const css = compiler.build([])

    const classes = [
      ...SPACING.map((v) => classMap.sp('p', v)),
      ...SPACING.map((v) => classMap.stack(v)),
      ...TEXT.map((v) => classMap.textSize(v)),
      ...FONT.map((v) => classMap.fontWeight(v)),
      ...WIDTH.map((v) => classMap.w(v)),
      ...HEIGHT.map((v) => classMap.h(v)),
      ...HEIGHT.map((v) => classMap.minH(v)),
      ...MAXW.map((v) => classMap.maxW(v)),
      // cm.gridRows(rows) → grid-rows-{rows}; Tailwind's default grid-rows range is
      // 1-6, which is exactly what the safelist covers.
      ...[1, 2, 3, 4, 5, 6].map((v) => classMap.gridRows(v)),
    ]
      // Some resolvers (cm.stack) return a MULTI-class string — check each class.
      .flatMap((s) => s.split(/\s+/))
      .filter(Boolean)
    // Tailwind escapes '.' and '/' in the generated selector (.p-0\.5, .h-1\/2).
    const esc = (c: string): string => '.' + c.replace(/[/.]/g, (m) => '\\' + m)
    const missing = [...new Set(classes)].filter((c) => !css.includes(esc(c)))
    expect(
      missing,
      `cm.* classes NOT rendered (missing from the safelist): ${missing.join(', ')}`,
    ).toEqual([])
  })
})
