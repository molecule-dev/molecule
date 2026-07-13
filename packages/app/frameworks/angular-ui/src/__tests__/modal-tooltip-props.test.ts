/**
 * Tests for the Modal `centered` / Tooltip `hasArrow` inline-style wiring.
 *
 * angular-ui ships `@Component`-decorated classes; node-env vitest can't
 * bootstrap them through TestBed, and `MoleculeModal` additionally can't be
 * `new`'d outside an Angular injection context (it calls
 * `inject(DomSanitizer)` at field-initializer time). Both components extract
 * their inline-style computation into standalone, exported pure functions
 * (`getModalWrapperStyle`, `getTooltipArrowStyle`) specifically so this
 * behavior stays testable without either — this file exercises those
 * functions directly, plus (for `MoleculeTooltip`, which has no injected
 * deps) the class getters/defaults that delegate to them.
 *
 * @module
 */
// Register Angular's JIT compiler facade before any @Component class loads —
// evaluating the decorators otherwise throws "needs the JIT compiler".
import '@angular/compiler'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) => cls.filter(Boolean).join(' ')
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

const { getModalWrapperStyle, MoleculeModal } = await import('../components/modal.component.js')
const { getTooltipArrowStyle, MoleculeTooltip } = await import('../components/tooltip.component.js')

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

describe('getModalWrapperStyle', () => {
  it('returns undefined when centered', () => {
    expect(getModalWrapperStyle(true)).toBeUndefined()
  })

  it('top-anchors the wrapper with an inline style when not centered', () => {
    expect(getModalWrapperStyle(false)).toEqual({ alignItems: 'flex-start' })
  })
})

describe('MoleculeModal.wrapperStyle', () => {
  // MoleculeModal can't be `new`'d directly here — invoke the getter with a
  // plain `this` stand-in instead, enough to prove the class wiring
  // delegates to getModalWrapperStyle() with the instance's `centered` value.
  const wrapperStyleGetter = Object.getOwnPropertyDescriptor(
    MoleculeModal.prototype,
    'wrapperStyle',
  )?.get

  it('is defined on the prototype', () => {
    expect(typeof wrapperStyleGetter).toBe('function')
  })

  it('delegates to getModalWrapperStyle() using the instance centered value', () => {
    expect(wrapperStyleGetter?.call({ centered: true })).toBeUndefined()
    expect(wrapperStyleGetter?.call({ centered: false })).toEqual({ alignItems: 'flex-start' })
  })
})

describe('getTooltipArrowStyle', () => {
  it('returns a themed inline style for every placement', () => {
    for (const placement of placements) {
      const style = getTooltipArrowStyle(placement)
      expect(style.position).toBe('absolute')
      expect(style.width).toBe('8px')
      expect(style.height).toBe('8px')
      expect(style.background).toBe('var(--color-surface)')
      expect(style.border).toBe('1px solid var(--color-border)')
    }
  })

  it('positions the arrow at the edge opposite the tooltip body', () => {
    expect(getTooltipArrowStyle('top').bottom).toBe('-4px')
    expect(getTooltipArrowStyle('bottom').top).toBe('-4px')
    expect(getTooltipArrowStyle('left').right).toBe('-4px')
    expect(getTooltipArrowStyle('right').left).toBe('-4px')
  })
})

describe('MoleculeTooltip hasArrow', () => {
  it('defaults to false', () => {
    const tooltip = new MoleculeTooltip()
    expect(tooltip.hasArrow).toBe(false)
  })

  it('arrowStyle getter delegates to getTooltipArrowStyle() using the instance placement', () => {
    const tooltip = new MoleculeTooltip()
    tooltip.placement = 'right'
    expect(tooltip.arrowStyle).toEqual(getTooltipArrowStyle('right'))
  })

  it('positionStyle starts empty until updatePosition() runs', () => {
    const tooltip = new MoleculeTooltip()
    expect(tooltip.positionStyle).toEqual({})
  })
})
