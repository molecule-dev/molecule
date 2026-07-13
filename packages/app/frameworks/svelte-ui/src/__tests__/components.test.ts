/**
 * Tests for svelte-ui's component class-generator functions.
 *
 * svelte-ui exports pure class-string generators (not Svelte components), so
 * each `getXClasses(options)` can be exercised directly. `@molecule/app-ui`
 * and `@molecule/app-icons` are stubbed so the generators run in node.
 *
 * @module
 */
import { describe, expect, it, vi } from 'vitest'

// getClassMap() → a Proxy: `cn(...)` joins truthy strings, every other access
// yields a callable that stringifies to its key, so both `cm.button({...})`
// and bare `getClassMap().alertDismiss` module-level consts resolve.
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .map((c) => (typeof c === 'function' ? c() : c))
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        const token = String(prop)
        const fn = (..._args: unknown[]) => token
        fn.toString = () => token
        return fn
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-icons', () => ({
  getIcon: vi.fn((name: string) => ({ name, viewBox: '0 0 24 24', paths: [] })),
}))

const components = await import('../components/index.js')

describe('component class generators — smoke', () => {
  it('exports a large set of getXClasses generators', () => {
    const generators = Object.keys(components).filter((k) => k.startsWith('get'))
    expect(generators.length).toBeGreaterThan(40)
  })

  it('every getX* export is a function', () => {
    for (const [name, value] of Object.entries(components)) {
      if (name.startsWith('get')) {
        expect(typeof value, name).toBe('function')
      }
    }
  })
})

describe('representative generators return class strings', () => {
  it('getButtonClasses honours variant/color/size options', () => {
    expect(typeof components.getButtonClasses({ variant: 'solid', color: 'primary' })).toBe(
      'string',
    )
    expect(typeof components.getButtonClasses()).toBe('string')
  })

  it('getAlertClasses / getBadgeClasses / getCardClasses return strings', () => {
    expect(typeof components.getAlertClasses({ status: 'error' })).toBe('string')
    expect(typeof components.getBadgeClasses({ color: 'success' })).toBe('string')
    expect(typeof components.getCardClasses()).toBe('string')
  })

  it('getInputClasses / getSelectClasses / getTextareaClasses return strings', () => {
    expect(typeof components.getInputClasses()).toBe('string')
    expect(typeof components.getSelectClasses()).toBe('string')
    expect(typeof components.getTextareaClasses()).toBe('string')
  })

  it('getTableClasses / getModalContentClasses / getTooltipClasses return strings', () => {
    expect(typeof components.getTableClasses()).toBe('string')
    expect(typeof components.getModalContentClasses()).toBe('string')
    expect(typeof components.getTooltipClasses()).toBe('string')
  })
})

describe('getModalWrapperStyle', () => {
  it('returns undefined when centered (the default)', () => {
    expect(components.getModalWrapperStyle()).toBeUndefined()
    expect(components.getModalWrapperStyle(true)).toBeUndefined()
  })

  it('top-anchors the wrapper with an inline style when not centered', () => {
    expect(components.getModalWrapperStyle(false)).toEqual({ alignItems: 'flex-start' })
  })
})

describe('getTooltipArrowStyle', () => {
  const placements = [
    'top',
    'top-start',
    'top-end',
    'bottom',
    'bottom-start',
    'bottom-end',
    'left',
    'right',
  ] as const

  it('returns a themed inline style for every placement', () => {
    for (const placement of placements) {
      const style = components.getTooltipArrowStyle(placement)
      expect(style.position).toBe('absolute')
      expect(style.width).toBe('8px')
      expect(style.height).toBe('8px')
      expect(style.background).toBe('var(--color-surface)')
      expect(style.border).toBe('1px solid var(--color-border)')
    }
  })

  it('positions the arrow at the edge opposite the tooltip body', () => {
    expect(components.getTooltipArrowStyle('top').bottom).toBe('-4px')
    expect(components.getTooltipArrowStyle('bottom').top).toBe('-4px')
    expect(components.getTooltipArrowStyle('left').right).toBe('-4px')
    expect(components.getTooltipArrowStyle('right').left).toBe('-4px')
  })
})

describe('icon-data + helper exports', () => {
  it('getAlertIconData resolves a known status to icon data', () => {
    expect(components.getAlertIconData('success')).toMatchObject({ name: expect.any(String) })
  })

  it('getSortIconData returns icon data for asc and desc', () => {
    expect(components.getSortIconData('asc')).toBeTruthy()
    expect(components.getSortIconData('desc')).toBeTruthy()
  })

  it('getPaginationIconData returns icon data for a direction', () => {
    expect(components.getPaginationIconData('next')).toBeTruthy()
  })

  it('generateToastId produces unique-ish ids', () => {
    expect(components.generateToastId()).not.toBe(components.generateToastId())
  })
})
