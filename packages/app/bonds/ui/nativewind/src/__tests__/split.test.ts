import { describe, expect, it } from 'vitest'

import { classMap } from '../classMap.js'
import { splitForNative } from '../split.js'

describe('splitForNative', () => {
  it('moves text classes off the view and reads the display', () => {
    expect(splitForNative('flex flex-row gap-2 p-4 text-sm font-bold text-primary')).toEqual({
      view: 'flex flex-row gap-2 p-4',
      text: 'text-sm font-bold text-primary',
      display: 'flex',
      lines: null,
      weight: 700,
    })
  })

  it('takes block and inline display classes off the view', () => {
    expect(splitForNative('block p-2')).toEqual({
      view: 'p-2',
      text: '',
      display: 'block',
      lines: null,
      weight: null,
    })
    expect(splitForNative('inline-flex items-center')).toEqual({
      view: 'flex items-center flex-row',
      text: '',
      display: 'inline-flex',
      lines: null,
      weight: null,
    })
    expect(splitForNative('hidden sm:flex').display).toBe('none')
  })

  it('a responsive display class does not set the base display', () => {
    expect(splitForNative('md:flex p-2').display).toBeNull()
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
    })
  })

  it('reads truncate and line-clamp as the line count, off every class list', () => {
    expect(splitForNative('truncate text-sm p-1')).toEqual({
      view: 'p-1',
      text: 'text-sm',
      display: null,
      lines: 1,
      weight: null,
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
    expect(splitForNative('grid gap-2').view).toBe('grid gap-2')
    expect(splitForNative('p-2').view).toBe('p-2')
  })

  it('reads the base font weight of the text in effect', () => {
    expect(splitForNative('', 'font-semibold').weight).toBe(600)
    expect(splitForNative('font-[650]').weight).toBe(650)
    expect(splitForNative('md:font-bold').weight).toBeNull()
    expect(splitForNative('font-bold', 'font-light').weight).toBe(700)
    expect(splitForNative('font-mono').weight).toBeNull()
  })

  it('is the ClassMap member', () => {
    expect(classMap.splitForNative?.(classMap.card(), '').text).toContain('text-foreground')
  })
})
