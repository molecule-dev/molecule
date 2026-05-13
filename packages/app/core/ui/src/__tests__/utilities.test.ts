import { describe, expect, it } from 'vitest'

import type { UIClassMap } from '../types.js'
import { extendClassMap } from '../utilities.js'

function fakeBase(): UIClassMap {
  return {
    page: 'base-page',
    headerBar: 'base-header',
    cardInteractive: 'base-card',
    button: ((opts: { variant?: string } = {}) =>
      `base-button-${opts.variant ?? 'default'}`) as UIClassMap['button'],
    spinner: (() => 'base-spinner') as UIClassMap['spinner'],
    cn: (...args: unknown[]) => args.filter((c) => typeof c === 'string' && c).join(' '),
  } as unknown as UIClassMap
}

describe('extendClassMap — object overrides', () => {
  it('returns a NEW object (does not mutate base)', () => {
    const base = fakeBase()
    const out = extendClassMap(base, { page: 'override-page' } as Partial<UIClassMap>)
    expect(out).not.toBe(base)
    expect((base as unknown as { page: string }).page).toBe('base-page')
  })

  it('replaces static tokens with override values', () => {
    const base = fakeBase()
    const out = extendClassMap(base, { page: 'my-dark-page' } as Partial<UIClassMap>)
    expect((out as unknown as { page: string }).page).toBe('my-dark-page')
  })

  it('preserves untouched tokens', () => {
    const base = fakeBase()
    const out = extendClassMap(base, { page: 'new-page' } as Partial<UIClassMap>)
    expect((out as unknown as { headerBar: string }).headerBar).toBe('base-header')
  })

  it('overrides multiple tokens at once', () => {
    const base = fakeBase()
    const out = extendClassMap(base, {
      page: 'new-page',
      headerBar: 'new-header',
      cardInteractive: 'new-card',
    } as Partial<UIClassMap>)
    expect((out as unknown as { page: string }).page).toBe('new-page')
    expect((out as unknown as { headerBar: string }).headerBar).toBe('new-header')
    expect((out as unknown as { cardInteractive: string }).cardInteractive).toBe('new-card')
  })

  it('can replace function resolvers entirely', () => {
    const base = fakeBase()
    const out = extendClassMap(base, {
      button: (() => 'wholly-new-button') as UIClassMap['button'],
    } as Partial<UIClassMap>)
    expect(out.button({ variant: 'primary' })).toBe('wholly-new-button')
  })

  it('empty overrides ({}) returns shallow copy of base', () => {
    const base = fakeBase()
    const out = extendClassMap(base, {} as Partial<UIClassMap>)
    expect(out).not.toBe(base) // new object
    expect((out as unknown as { page: string }).page).toBe('base-page')
  })
})

describe('extendClassMap — function overrides', () => {
  it('passes the base into the override function', () => {
    const base = fakeBase()
    let captured: UIClassMap | null = null
    extendClassMap(base, (b) => {
      captured = b
      return {}
    })
    expect(captured).toBe(base)
  })

  it('function override can extend resolvers (compose with base output)', () => {
    const base = fakeBase()
    const out = extendClassMap(base, (b) => ({
      button: (opts) => `${(b.button as (o: typeof opts) => string)(opts)} extra-class`,
    }))
    expect(out.button({ variant: 'primary' })).toBe('base-button-primary extra-class')
  })

  it('function override can replace static tokens', () => {
    const base = fakeBase()
    const out = extendClassMap(
      base,
      () =>
        ({
          page: 'fn-override-page',
        }) as Partial<UIClassMap>,
    )
    expect((out as unknown as { page: string }).page).toBe('fn-override-page')
  })

  it('function override can mix static + resolver overrides', () => {
    const base = fakeBase()
    const out = extendClassMap(base, (b) => ({
      page: 'mixed-page',
      button: (opts) => `${(b.button as (o: typeof opts) => string)(opts)} mixed`,
    }))
    expect((out as unknown as { page: string }).page).toBe('mixed-page')
    expect(out.button({ variant: 'x' })).toBe('base-button-x mixed')
  })

  it('successive extendClassMap calls compose left-to-right', () => {
    const base = fakeBase()
    const first = extendClassMap(base, { page: 'first-page' } as Partial<UIClassMap>)
    const second = extendClassMap(first, { page: 'second-page' } as Partial<UIClassMap>)
    expect((second as unknown as { page: string }).page).toBe('second-page')
  })
})
