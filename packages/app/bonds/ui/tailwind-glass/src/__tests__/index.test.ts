import { describe, expect, it } from 'vitest'

import { classMap, glassOverrides } from '../classMap.js'

describe('@molecule/app-ui-tailwind-glass', () => {
  describe('classMap', () => {
    it('exports a complete UIClassMap', () => {
      expect(classMap).toBeDefined()
      expect(typeof classMap.cn).toBe('function')
      expect(typeof classMap.button).toBe('function')
      expect(typeof classMap.card).toBe('function')
      expect(typeof classMap.modal).toBe('function')
    })

    it('adds backdrop-blur to card classes', () => {
      const cardClasses = classMap.card()
      expect(cardClasses).toContain('backdrop-blur')
      expect(cardClasses).toContain('backdrop-saturate')
    })

    it('adds backdrop-blur to modal classes', () => {
      const modalClasses = classMap.modal()
      expect(modalClasses).toContain('backdrop-blur')
    })

    it('adds backdrop-blur to toast classes', () => {
      const toastClasses = classMap.toast()
      expect(toastClasses).toContain('backdrop-blur')
    })

    it('adds backdrop-blur to tooltip classes', () => {
      const tooltipClasses = classMap.tooltip()
      expect(tooltipClasses).toContain('backdrop-blur')
    })

    it('adds backdrop-blur to headerBar', () => {
      expect(classMap.headerBar).toContain('backdrop-blur')
      expect(classMap.headerBar).toContain('backdrop-saturate')
    })

    it('adds backdrop-blur to drawer', () => {
      expect(classMap.drawer).toContain('backdrop-blur')
    })

    it('adds backdrop-blur to dropdownContent', () => {
      expect(classMap.dropdownContent).toContain('backdrop-blur')
    })

    it('adds backdrop-blur to tabsList', () => {
      expect(classMap.tabsList()).toContain('backdrop-blur')
    })

    it('preserves variant/size options while layering on backdrop-blur', () => {
      const lineTabsList = classMap.tabsList({ variant: 'line' })
      expect(lineTabsList).toContain('backdrop-blur')
      expect(lineTabsList).toContain('border-b')
    })

    it('adds backdrop-blur to actionSheet', () => {
      expect(classMap.actionSheet).toContain('backdrop-blur')
    })

    it('preserves base classMap behavior for non-glass components', () => {
      const buttonClasses = classMap.button()
      expect(buttonClasses).toContain('inline-flex')
      expect(buttonClasses).not.toContain('backdrop-blur')
    })

    it('inherits the base touchTarget token (glass adds no touch override)', () => {
      // Glass is a web Tailwind variant — touch detection is identical to the
      // base bond, so the coarse-pointer-scoped >=44px token must pass through.
      expect(classMap.touchTarget).toContain('pointer-coarse:min-h-[44px]')
      expect(classMap.touchTarget).toContain('pointer-coarse:min-w-[44px]')
    })
  })

  describe('semantic tone classes (inherited from the base bond)', () => {
    const TONES = ['primary', 'secondary', 'success', 'warning', 'error', 'info'] as const

    it('resolves every tone of every tone member to a non-empty class naming that tone', () => {
      for (const tone of TONES) {
        expect(classMap.textTone(tone)).toBe(`text-${tone}`)
        expect(classMap.bgTone(tone)).toBe(`bg-${tone}`)
        expect(classMap.borderTone(tone)).toBe(`border-${tone}`)
      }
    })

    it('bgTone({ subtle: true }) returns the light tint, distinct from solid', () => {
      for (const tone of TONES) {
        const subtle = classMap.bgTone(tone, { subtle: true })
        expect(subtle).toBe(`bg-${tone}-light`)
        expect(subtle).not.toBe(classMap.bgTone(tone))
      }
    })

    it('textOnTone and bgScrim pass through from the base bond', () => {
      expect(classMap.textOnTone).toBe('text-foreground-inverse')
      expect(classMap.bgScrim).toBe('bg-overlay')
    })
  })

  describe('glassOverrides', () => {
    it('exports overrides as a function', () => {
      expect(typeof glassOverrides).toBe('function')
    })
  })
})
