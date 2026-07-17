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
      const p = createProvider({ singleDate: true })
      expect(p.name).toBe('default')
    })

    it('should apply config.singleDate as a provider-wide default', () => {
      const p = createProvider({ singleDate: true })
      const picker = p.createPicker({})
      picker.setValue({
        startDate: new Date('2025-03-10'),
        endDate: new Date('2025-03-20'),
      })
      const value = picker.getValue()!
      expect(value.startDate.getTime()).toBe(value.endDate.getTime())
      expect(value.startDate.toISOString()).toBe(new Date('2025-03-10').toISOString())
    })

    it('per-call options.singleDate overrides the provider default', () => {
      const p = createProvider({ singleDate: true })
      const picker = p.createPicker({ singleDate: false })
      picker.setValue({
        startDate: new Date('2025-03-10'),
        endDate: new Date('2025-03-20'),
      })
      const value = picker.getValue()!
      expect(value.startDate.getTime()).not.toBe(value.endDate.getTime())
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

  describe('minDate / maxDate clamping', () => {
    const minDate = new Date('2025-01-10')
    const maxDate = new Date('2025-01-20')

    it('clamps a start date below minDate up to minDate', () => {
      const picker = provider.createPicker({ minDate, maxDate })
      picker.setValue({
        startDate: new Date('2025-01-01'), // below min
        endDate: new Date('2025-01-15'),
      })
      const value = picker.getValue()!
      expect(value.startDate.getTime()).toBe(minDate.getTime())
      expect(value.endDate.getTime()).toBe(new Date('2025-01-15').getTime())
    })

    it('clamps an end date above maxDate down to maxDate', () => {
      const picker = provider.createPicker({ minDate, maxDate })
      picker.setValue({
        startDate: new Date('2025-01-15'),
        endDate: new Date('2025-01-31'), // above max
      })
      const value = picker.getValue()!
      expect(value.startDate.getTime()).toBe(new Date('2025-01-15').getTime())
      expect(value.endDate.getTime()).toBe(maxDate.getTime())
    })

    it('clamps the initial value from options into range', () => {
      const picker = provider.createPicker({
        minDate,
        maxDate,
        startDate: new Date('2025-01-01'), // below min
        endDate: new Date('2025-01-31'), // above max
      })
      const value = picker.getValue()!
      expect(value.startDate.getTime()).toBe(minDate.getTime())
      expect(value.endDate.getTime()).toBe(maxDate.getTime())
    })

    it('onChange reports the clamped range', () => {
      const onChange = vi.fn()
      const picker = provider.createPicker({ minDate, maxDate, onChange })
      picker.setValue({
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
      })
      const reported = onChange.mock.calls[0][0]
      expect(reported.startDate.getTime()).toBe(minDate.getTime())
      expect(reported.endDate.getTime()).toBe(maxDate.getTime())
    })

    it('leaves an in-range selection untouched', () => {
      const picker = provider.createPicker({ minDate, maxDate })
      picker.setValue({
        startDate: new Date('2025-01-12'),
        endDate: new Date('2025-01-18'),
      })
      const value = picker.getValue()!
      expect(value.startDate.getTime()).toBe(new Date('2025-01-12').getTime())
      expect(value.endDate.getTime()).toBe(new Date('2025-01-18').getTime())
    })
  })

  describe('singleDate mode', () => {
    it('collapses a selection to a single-day range on one setValue', () => {
      const picker = provider.createPicker({ singleDate: true })
      picker.setValue({
        startDate: new Date('2025-05-05'),
        endDate: new Date('2025-05-25'),
      })
      const value = picker.getValue()!
      expect(value.startDate.getTime()).toBe(value.endDate.getTime())
      expect(value.startDate.toISOString()).toBe(new Date('2025-05-05').toISOString())
    })

    it('collapses the initial value when only startDate is given', () => {
      const picker = provider.createPicker({
        singleDate: true,
        startDate: new Date('2025-05-05'),
      })
      const value = picker.getValue()!
      expect(value.startDate.getTime()).toBe(value.endDate.getTime())
      expect(value.startDate.toISOString()).toBe(new Date('2025-05-05').toISOString())
    })

    it('fires onChange with a same-day range', () => {
      const onChange = vi.fn()
      const picker = provider.createPicker({ singleDate: true, onChange })
      picker.setValue({
        startDate: new Date('2025-05-05'),
        endDate: new Date('2025-05-25'),
      })
      const reported = onChange.mock.calls[0][0]
      expect(reported.startDate.getTime()).toBe(reported.endDate.getTime())
    })

    it('clamps the single day into [minDate, maxDate]', () => {
      const picker = provider.createPicker({
        singleDate: true,
        minDate: new Date('2025-05-10'),
        maxDate: new Date('2025-05-20'),
      })
      picker.setValue({
        startDate: new Date('2025-05-01'), // below min
        endDate: new Date('2025-05-01'),
      })
      const value = picker.getValue()!
      expect(value.startDate.getTime()).toBe(new Date('2025-05-10').getTime())
      expect(value.endDate.getTime()).toBe(new Date('2025-05-10').getTime())
    })
  })
})
