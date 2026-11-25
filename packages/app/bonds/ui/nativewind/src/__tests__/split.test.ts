import { describe, expect, it } from 'vitest'

import { classMap } from '../classMap.js'
import { splitForNative } from '../split.js'

describe('splitForNative', () => {
  it('passes structural row rules to descendants and exposes table cell alignment', () => {
    expect(splitForNative('[&_tr:last-child]:border-0', '').descendants).toEqual({
      'tr:last-child': '!border-0',
    })
    expect(splitForNative('h-12 align-middle', '')).toMatchObject({
      verticalAlign: 'middle',
      view: 'h-12',
    })
  })

  it('keeps display contents as layout metadata for a boxless fieldset', () => {
    expect(splitForNative('contents opacity-50', '')).toMatchObject({
      display: 'contents',
      view: 'opacity-50',
    })
  })

  it('moves text classes off the view and reads the display', () => {
    expect(splitForNative('flex flex-row gap-2 p-4 text-sm font-bold text-primary')).toEqual({
      view: 'flex flex-row gap-2 p-4',
      text: 'text-sm font-bold text-primary',
      display: 'flex',
      lines: null,
      weight: 700,
      lineHeight: { '': 20 },
      descendants: {},
      grid: null,
      span: {},
      sized: { width: false, height: false },
    })
  })

  it('takes block and inline display classes off the view', () => {
    expect(splitForNative('block p-2')).toEqual({
      view: 'p-2',
      text: '',
      display: 'block',
      lines: null,
      weight: null,
      lineHeight: { '': 24 },
      descendants: {},
      grid: null,
      span: {},
      sized: { width: false, height: false },
    })
    expect(splitForNative('inline-flex items-center')).toEqual({
      view: 'flex items-center flex-row',
      text: '',
      display: 'inline-flex',
      lines: null,
      weight: null,
      lineHeight: { '': 24 },
      descendants: {},
      grid: null,
      span: {},
      sized: { width: false, height: false },
    })
    expect(splitForNative('hidden sm:flex').display).toBe('none')
  })

  it('a responsive display class does not set the base display', () => {
    expect(splitForNative('md:flex p-2').display).toBeNull()
  })

  it('makes an absolutely positioned or fixed element a block, as CSS does', () => {
    // FloatingInput's label is an inline `label` placed with `absolute`: on the web it never sits
    // in a line, so a device must not lay it in one.
    expect(splitForNative('absolute left-3 top-2').display).toBe('block')
    expect(splitForNative('fixed inline').display).toBe('block')
    expect(splitForNative('absolute inline-block').display).toBe('block')
    expect(splitForNative('absolute inline-flex items-center').display).toBe('flex')
    expect(splitForNative('fixed inline-grid grid-cols-2').display).toBe('grid')
    expect(splitForNative('absolute hidden').display).toBe('none')
    expect(splitForNative('absolute contents').display).toBe('contents')
    // The last position class wins, and a position at a variant leaves the base display alone.
    expect(splitForNative('absolute relative inline').display).toBe('inline')
    expect(splitForNative('md:absolute inline').display).toBe('inline')
    expect(splitForNative('relative').display).toBeNull()
  })

  it("an element's own text class replaces the inherited one that sets the same property", () => {
    expect(splitForNative('text-primary', 'text-foreground text-sm').text).toBe(
      'text-sm text-primary',
    )
    expect(splitForNative('font-bold', 'font-semibold').text).toBe('font-bold')
  })

  it('a class that sets only part of what an inherited class sets keeps it', () => {
    // text-sm sets the font size and the line height; leading-6 only the line height.
    expect(splitForNative('leading-6', 'text-sm').text).toBe('text-sm leading-6')
    // text-xs sets both, so an inherited leading-6 gives way.
    expect(splitForNative('text-xs', 'leading-6').text).toBe('text-xs')
  })

  it('variants override only their own variant', () => {
    expect(splitForNative('dark:text-white', 'text-foreground dark:text-black').text).toBe(
      'text-foreground dark:text-white',
    )
  })

  it('a container with no text classes hands the inherited ones on', () => {
    expect(splitForNative('p-4', 'text-foreground')).toEqual({
      view: 'p-4',
      text: 'text-foreground',
      display: null,
      lines: null,
      weight: null,
      lineHeight: { '': 24 },
      descendants: {},
      grid: null,
      span: {},
      sized: { width: false, height: false },
    })
  })

  it('reads truncate and line-clamp as the line count, off every class list', () => {
    expect(splitForNative('truncate text-sm p-1')).toEqual({
      view: 'p-1',
      text: 'text-sm',
      display: null,
      lines: 1,
      weight: null,
      lineHeight: { '': 20 },
      descendants: {},
      grid: null,
      span: {},
      sized: { width: false, height: false },
    })
    expect(splitForNative('line-clamp-3').lines).toBe(3)
    expect(splitForNative('line-clamp-3 line-clamp-none').lines).toBeNull()
  })

  it('keeps only the line height of an inherited size whose font size the element sets', () => {
    expect(splitForNative('text-[15px]', 'text-base text-foreground').text).toBe(
      'leading-[1.5] text-foreground text-[15px]',
    )
    expect(splitForNative('md:text-[15px]', 'md:text-sm').text).toBe(
      `md:leading-[${1.25 / 0.875}] md:text-[15px]`,
    )
    // A named size sets both properties, so it replaces the inherited one whole.
    expect(splitForNative('text-sm', 'text-base').text).toBe('text-sm')
  })

  it('lays a flex container that names no direction in a row, as the web does', () => {
    expect(splitForNative('flex items-center p-6').view).toBe('flex items-center p-6 flex-row')
    expect(splitForNative('hidden md:flex').view).toBe('hidden md:flex md:flex-row')
    // A direction class at any variant is the author's choice; a block is never given one.
    expect(splitForNative('flex flex-col').view).toBe('flex flex-col')
    expect(splitForNative('flex md:flex-col').view).toBe('flex md:flex-col')
    // A grid is no flex container: the native elements lay it out from the split's `grid`.
    expect(splitForNative('grid gap-2').view).toBe('gap-2')
    expect(splitForNative('p-2').view).toBe('p-2')
  })

  it('reads the base font weight of the text in effect', () => {
    expect(splitForNative('', 'font-semibold').weight).toBe(600)
    expect(splitForNative('font-[650]').weight).toBe(650)
    expect(splitForNative('md:font-bold').weight).toBeNull()
    expect(splitForNative('font-bold', 'font-light').weight).toBe(700)
    expect(splitForNative('font-mono').weight).toBeNull()
  })

  it('hands the classes a descendant selector names to descendants with that tag', () => {
    const split = splitForNative('p-2 text-sm [&_p]:leading-relaxed dark:[&_p]:text-primary')
    expect(split.view).toBe('p-2')
    expect(split.text).toBe('text-sm')
    expect(split.descendants).toEqual({ p: 'leading-relaxed dark:text-primary' })
    expect(splitForNative('p-2').descendants).toEqual({})
  })

  it("applies a data-attribute class only when the element's data attributes match it", () => {
    const classes =
      'border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[disabled]:opacity-50'
    expect(splitForNative(classes, '', { state: 'checked' })).toMatchObject({
      view: 'border !bg-primary',
      text: '!text-primary-foreground',
    })
    expect(splitForNative(classes, '', { state: 'unchecked', disabled: '' })).toMatchObject({
      view: 'border !opacity-50',
      text: '',
    })
    expect(splitForNative(classes).view).toBe('border')
    expect(splitForNative('dark:data-[state=open]:bg-muted', '', { state: 'open' }).view).toBe(
      'dark:!bg-muted',
    )
  })

  it('ranks an active state class over the plain class it overrides, as the web does', () => {
    const line = splitForNative(classMap.tabsTrigger({ variant: 'line' }), '', { state: 'active' })
    expect(line.view).toContain('border-transparent')
    expect(line.view).toContain('!border-primary')
    expect(line.text).toContain('!text-primary')
    // An important text class is still a text class.
    expect(splitForNative('!text-sm p-1')).toMatchObject({ view: 'p-1', text: '!text-sm' })
  })

  it('gives the Tabs trigger its active colours on a device only while it is active', () => {
    const trigger = classMap.tabsTrigger()
    const active = splitForNative(trigger, '', { state: 'active' })
    const inactive = splitForNative(trigger, '', { state: 'inactive' })
    expect(active.view).toContain('bg-background')
    expect(inactive.view).not.toContain('bg-background')
    expect(`${active.view} ${active.text}`).not.toContain('data-[')
  })

  it('reads a grid: its columns, gaps and item alignment at each breakpoint, off the view', () => {
    const split = splitForNative(
      'grid grid-cols-1 sm:grid-cols-[1fr_2fr] lg:grid-cols-none grid-rows-3 md:grid-rows-[auto_1fr] gap-x-2 gap-y-[10px] md:gap-6 items-center p-4',
    )
    expect(split.display).toBe('grid')
    expect(split.grid).toEqual({
      columns: { '': 1, sm: '1fr 2fr', lg: 1 },
      rows: { '': 3, md: 'auto 1fr' },
      columnGap: { '': 8, md: 24 },
      rowGap: { '': 10, md: 24 },
      alignItems: { '': 'center' },
    })
    expect(split.view).toBe('gap-x-2 gap-y-[10px] md:gap-6 items-center p-4')
    expect(splitForNative('inline-grid grid-cols-2').display).toBe('inline-grid')
  })

  it('reads a grid item span and gives no grid to an element that is not one', () => {
    const split = splitForNative('col-span-2 md:col-span-full gap-4 p-2')
    expect(split.span).toEqual({ '': 2, md: 'full' })
    expect(split.grid).toBeNull()
    expect(split.view).toBe('gap-4 p-2')
    expect(splitForNative('p-2').span).toEqual({})
  })

  it("reads the text's line height in pixels, a leading class winning over the size's", () => {
    expect(splitForNative('text-sm').lineHeight?.['']).toBe(20)
    expect(splitForNative('text-sm leading-relaxed').lineHeight?.['']).toBeCloseTo(22.75)
    expect(splitForNative('leading-6 text-lg').lineHeight?.['']).toBe(24)
    expect(splitForNative('', 'font-document text-base text-foreground').lineHeight?.['']).toBe(24)
    expect(splitForNative('text-[15px] leading-[1.4]').lineHeight?.['']).toBeCloseTo(21)
    expect(splitForNative(classMap.textarea()).lineHeight?.['']).toBe(21.25)
  })

  it('resolves line heights at font-size and leading breakpoints in screen order', () => {
    expect(
      splitForNative('md:leading-tight text-sm sm:text-base lg:text-[17px]').lineHeight,
    ).toEqual({
      '': 20,
      sm: 24,
      md: 20,
      lg: 21.25,
    })
  })

  it('uses the preflight ratio with the default or an arbitrary font size', () => {
    expect(splitForNative('p-2 text-primary').lineHeight).toEqual({ '': 24 })
    expect(splitForNative('text-[17px] sm:text-[20px]').lineHeight).toEqual({
      '': 25.5,
      sm: 30,
    })
  })

  it("says which sizes the classes set, which beat a replaced element's size attributes", () => {
    expect(splitForNative('h-5 w-5').sized).toEqual({ width: true, height: true })
    expect(splitForNative('size-4').sized).toEqual({ width: true, height: true })
    expect(splitForNative('md:w-8 text-info').sized).toEqual({ width: true, height: false })
    expect(splitForNative('min-h-4 max-w-full p-1').sized).toEqual({ width: false, height: false })
  })

  it('is the ClassMap member', () => {
    expect(classMap.splitForNative?.(classMap.card(), '').text).toContain('text-foreground')
  })
})
