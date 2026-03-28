import { beforeEach, describe, expect, it } from 'vitest'

import type {
  DatePreset,
  DateRange,
  DateRangeInstance,
  DateRangeOptions,
  DateRangePickerProvider,
} from '../index.js'
import { getProvider, hasProvider, requireProvider, setProvider } from '../index.js'

describe('@molecule/app-date-range-picker', () => {
  beforeEach(() => {
    setProvider(null as unknown as DateRangePickerProvider)
  })

  describe('Types compile correctly', () => {
    it('should compile DateRange type', () => {
      const range: DateRange = {
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
      }
      expect(range.startDate.getFullYear()).toBe(2025)
    })

    it('should compile DatePreset type', () => {
      const preset: DatePreset = {
        label: 'Last 7 days',
        range: {
          startDate: new Date('2025-01-24'),
          endDate: new Date('2025-01-31'),
        },
      }
      expect(preset.label).toBe('Last 7 days')
    })

    it('should compile DateRangeOptions type', () => {
      const options: DateRangeOptions = {
        startDate: new Date(),
        endDate: new Date(),
        minDate: new Date('2020-01-01'),
        maxDate: new Date('2030-12-31'),
        presets: [],
        onChange: () => {},
        locale: 'en-US',
        singleDate: false,
      }
      expect(options.locale).toBe('en-US')
    })

    it('should compile DateRangeOptions with minimal fields', () => {
      const options: DateRangeOptions = {}
      expect(options.startDate).toBeUndefined()
    })

    it('should compile DateRangeInstance type', () => {
      const instance: DateRangeInstance = {
        getValue: () => null,
        setValue: () => {},
        clear: () => {},
        open: () => {},
        close: () => {},
        destroy: () => {},
      }
      expect(instance.getValue()).toBeNull()
    })

    it('should compile DateRangePickerProvider type', () => {
      const provider: DateRangePickerProvider = {
        name: 'test',
        createPicker: () => ({
          getValue: () => null,
          setValue: () => {},
          clear: () => {},
          open: () => {},
          close: () => {},
          destroy: () => {},
        }),
      }
      expect(provider.name).toBe('test')
    })
  })

  describe('Provider management', () => {
    it('should return null when no provider is set', () => {
      expect(getProvider()).toBeNull()
    })

    it('should return false for hasProvider when none set', () => {
      expect(hasProvider()).toBe(false)
    })

    it('should throw on requireProvider when none set', () => {
      expect(() => requireProvider()).toThrow(
        'DateRangePicker provider not configured. Bond a date-range-picker provider first.',
      )
    })

    it('should set and get a provider', () => {
      const mockProvider: DateRangePickerProvider = {
        name: 'test-picker',
        createPicker: () => ({
          getValue: () => null,
          setValue: () => {},
          clear: () => {},
          open: () => {},
          close: () => {},
          destroy: () => {},
        }),
      }
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
      expect(hasProvider()).toBe(true)
      expect(requireProvider()).toBe(mockProvider)
    })
  })

  describe('Provider operations', () => {
    it('should create a picker instance', () => {
      const range: DateRange = {
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
      }
      const mockInstance: DateRangeInstance = {
        getValue: () => range,
        setValue: () => {},
        clear: () => {},
        open: () => {},
        close: () => {},
        destroy: () => {},
      }
      const mockProvider: DateRangePickerProvider = {
        name: 'test',
        createPicker: () => mockInstance,
      }
      setProvider(mockProvider)

      const picker = requireProvider().createPicker({})
      expect(picker.getValue()).toEqual(range)
    })
  })
})
