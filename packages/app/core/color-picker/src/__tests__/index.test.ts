import { beforeEach, describe, expect, it } from 'vitest'

import type { ColorPickerInstance, ColorPickerOptions, ColorPickerProvider } from '../index.js'
import { getProvider, hasProvider, requireProvider, setProvider } from '../index.js'

describe('@molecule/app-color-picker', () => {
  beforeEach(() => {
    setProvider(null as unknown as ColorPickerProvider)
  })

  describe('Types compile correctly', () => {
    it('should compile ColorPickerOptions type', () => {
      const options: ColorPickerOptions = {
        value: '#ff0000',
        format: 'hex',
        presets: ['#ff0000', '#00ff00', '#0000ff'],
        showAlpha: true,
        showInput: true,
        onChange: () => {},
      }
      expect(options.value).toBe('#ff0000')
      expect(options.presets).toHaveLength(3)
    })

    it('should compile ColorPickerOptions with minimal fields', () => {
      const options: ColorPickerOptions = {}
      expect(options.value).toBeUndefined()
    })

    it('should compile ColorPickerOptions with rgb format', () => {
      const options: ColorPickerOptions = {
        value: 'rgb(255, 0, 0)',
        format: 'rgb',
      }
      expect(options.format).toBe('rgb')
    })

    it('should compile ColorPickerOptions with hsl format', () => {
      const options: ColorPickerOptions = {
        value: 'hsl(0, 100%, 50%)',
        format: 'hsl',
      }
      expect(options.format).toBe('hsl')
    })

    it('should compile ColorPickerInstance type', () => {
      const instance: ColorPickerInstance = {
        getValue: () => '#ff0000',
        setValue: () => {},
        getFormat: () => 'hex',
        setFormat: () => {},
        destroy: () => {},
      }
      expect(instance.getValue()).toBe('#ff0000')
      expect(instance.getFormat()).toBe('hex')
    })

    it('should compile ColorPickerProvider type', () => {
      const provider: ColorPickerProvider = {
        name: 'test',
        createPicker: () => ({
          getValue: () => '#000000',
          setValue: () => {},
          getFormat: () => 'hex',
          setFormat: () => {},
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
        'ColorPicker provider not configured. Bond a color-picker provider first.',
      )
    })

    it('should set and get a provider', () => {
      const mockProvider: ColorPickerProvider = {
        name: 'test-picker',
        createPicker: () => ({
          getValue: () => '#000000',
          setValue: () => {},
          getFormat: () => 'hex',
          setFormat: () => {},
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
      const mockInstance: ColorPickerInstance = {
        getValue: () => '#3498db',
        setValue: () => {},
        getFormat: () => 'hex',
        setFormat: () => {},
        destroy: () => {},
      }
      const mockProvider: ColorPickerProvider = {
        name: 'test',
        createPicker: () => mockInstance,
      }
      setProvider(mockProvider)

      const picker = requireProvider().createPicker({ value: '#3498db' })
      expect(picker.getValue()).toBe('#3498db')
      expect(picker.getFormat()).toBe('hex')
    })

    it('should allow changing format on instance', () => {
      let currentFormat = 'hex'
      const mockInstance: ColorPickerInstance = {
        getValue: () => '#ff0000',
        setValue: () => {},
        getFormat: () => currentFormat,
        setFormat: (format) => {
          currentFormat = format
        },
        destroy: () => {},
      }
      const mockProvider: ColorPickerProvider = {
        name: 'test',
        createPicker: () => mockInstance,
      }
      setProvider(mockProvider)

      const picker = requireProvider().createPicker({})
      expect(picker.getFormat()).toBe('hex')
      picker.setFormat('rgb')
      expect(picker.getFormat()).toBe('rgb')
    })
  })
})
