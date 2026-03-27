import { describe, expect, it, vi } from 'vitest'

import type { DateRangePickerProvider } from '@molecule/app-date-range-picker'

import { createProvider, provider } from '../index.js'

describe('@molecule/app-date-range-picker-default', () => {
  describe('provider', () => {
    it('should export a default provider instance', () => {
      expect(provider).toBeDefined()
      expect(provider.name).toBe('default')
    })

    it('should conform to DateRangePickerProvider interface', () => {
      const p: DateRangePickerProvider = provider
      expect(typeof p.createPicker).toBe('function')
    })
  })

  describe('createProvider', () => {
    it('should create a provider with default config', () => {
      const p = createProvider()
      expect(p.name).toBe('default')
    })

    it('should create a provider with custom config', () => {
      const p = createProvider({ locale: 'de-DE' })
      expect(p.name).toBe('default')
    })
  })

  describe('picker instance', () => {
    it('should create with no initial value', () => {
      const picker = provider.createPicker({})
      expect(picker.getValue()).toBeNull()
    })

    it('should create with initial dates', () => {
      const picker = provider.createPicker({
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
      })
      const value = picker.getValue()
      expect(value).not.toBeNull()
      expect(value!.startDate.getFullYear()).toBe(2025)
    })

    it('should set value', () => {
      const picker = provider.createPicker({})
      picker.setValue({
        startDate: new Date('2025-06-01'),
        endDate: new Date('2025-06-30'),
      })
      const value = picker.getValue()
      expect(value).not.toBeNull()
      expect(value!.startDate.getMonth()).toBe(5) // June is month 5
    })

    it('should call onChange when value is set', () => {
      const onChange = vi.fn()
      const picker = provider.createPicker({ onChange })
      picker.setValue({
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
      })
      expect(onChange).toHaveBeenCalled()
    })

    it('should clear value', () => {
      const picker = provider.createPicker({
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
      })
      picker.clear()
      expect(picker.getValue()).toBeNull()
    })

    it('should not mutate returned value', () => {
      const picker = provider.createPicker({
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
      })
      const value1 = picker.getValue()!
      value1.startDate = new Date('2099-01-01')
      const value2 = picker.getValue()!
      expect(value2.startDate.getFullYear()).toBe(2025)
    })

    it('should open and close', () => {
      const picker = provider.createPicker({})
      expect(() => picker.open()).not.toThrow()
      expect(() => picker.close()).not.toThrow()
    })

    it('should destroy and clear state', () => {
      const picker = provider.createPicker({
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
      })
      picker.destroy()
      expect(picker.getValue()).toBeNull()
    })
  })
})
