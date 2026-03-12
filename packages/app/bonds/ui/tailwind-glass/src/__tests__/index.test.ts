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
      expect(classMap.tabsList).toContain('backdrop-blur')
    })

    it('adds backdrop-blur to actionSheet', () => {
      expect(classMap.actionSheet).toContain('backdrop-blur')
    })

    it('preserves base classMap behavior for non-glass components', () => {
      const buttonClasses = classMap.button()
      expect(buttonClasses).toContain('inline-flex')
      expect(buttonClasses).not.toContain('backdrop-blur')
    })
  })

  describe('glassOverrides', () => {
    it('exports overrides as a function', () => {
      expect(typeof glassOverrides).toBe('function')
    })
  })
})
