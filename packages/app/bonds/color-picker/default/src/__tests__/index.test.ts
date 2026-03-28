import { describe, expect, it, vi } from 'vitest'

import type { ColorPickerProvider } from '@molecule/app-color-picker'

import { createProvider, provider } from '../index.js'

describe('@molecule/app-color-picker-default', () => {
  describe('provider', () => {
    it('should export a default provider instance', () => {
      expect(provider).toBeDefined()
      expect(provider.name).toBe('default')
    })

    it('should conform to ColorPickerProvider interface', () => {
      const p: ColorPickerProvider = provider
      expect(typeof p.createPicker).toBe('function')
    })
  })

  describe('createProvider', () => {
    it('should create a provider with default config', () => {
      const p = createProvider()
      expect(p.name).toBe('default')
    })

    it('should create a provider with custom config', () => {
      const p = createProvider({ format: 'rgb' })
      expect(p.name).toBe('default')
    })
  })

  describe('picker instance', () => {
    it('should create with default value', () => {
      const picker = provider.createPicker({})
      expect(picker.getValue()).toBe('#000000')
    })

    it('should create with initial value', () => {
      const picker = provider.createPicker({ value: '#ff0000' })
      expect(picker.getValue()).toBe('#ff0000')
    })

    it('should set value', () => {
      const picker = provider.createPicker({})
      picker.setValue('#3498db')
      expect(picker.getValue()).toBe('#3498db')
    })

    it('should call onChange when value is set', () => {
      const onChange = vi.fn()
      const picker = provider.createPicker({ onChange })
      picker.setValue('#ff0000')
      expect(onChange).toHaveBeenCalledWith('#ff0000')
    })

    it('should get default format', () => {
      const picker = provider.createPicker({})
      expect(picker.getFormat()).toBe('hex')
    })

    it('should create with custom format', () => {
      const picker = provider.createPicker({ format: 'rgb' })
      expect(picker.getFormat()).toBe('rgb')
    })

    it('should set format', () => {
      const picker = provider.createPicker({})
      picker.setFormat('hsl')
      expect(picker.getFormat()).toBe('hsl')
    })

    it('should destroy without error', () => {
      const picker = provider.createPicker({})
      expect(() => picker.destroy()).not.toThrow()
    })

    it('should work with presets option', () => {
      const picker = provider.createPicker({
        presets: ['#ff0000', '#00ff00', '#0000ff'],
        value: '#ff0000',
      })
      expect(picker.getValue()).toBe('#ff0000')
    })

    it('should work with showAlpha option', () => {
      const picker = provider.createPicker({
        showAlpha: true,
        value: 'rgba(255,0,0,0.5)',
      })
      expect(picker.getValue()).toBe('rgba(255,0,0,0.5)')
    })
  })
})
