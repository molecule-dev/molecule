/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

import { requireProvider, setProvider } from '@molecule/app-color-picker'

import { createProvider } from '../index.js'

describe('README @example', () => {
  it('bonds the provider and tracks the picked color through onChange', () => {
    setProvider(createProvider({ format: 'hex' }))

    let brandColor = '#3b82f6'
    const picker = requireProvider().createPicker({
      value: brandColor,
      presets: ['#3b82f6', '#10b981', '#f59e0b'],
      onChange: (color) => {
        brandColor = color
      },
    })

    expect(picker.getValue()).toBe('#3b82f6')
    picker.setValue('#10b981')
    expect(brandColor).toBe('#10b981')
    expect(picker.getValue()).toBe('#10b981')
    expect(picker.getFormat()).toBe('hex')
    picker.destroy()
  })
})
