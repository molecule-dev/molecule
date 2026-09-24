/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the default bond.
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

import { provider } from '@molecule/app-color-picker-default'

import { requireProvider, setProvider } from '../index.js'

describe('README @example', () => {
  it('creates a headless picker whose setValue updates the value and fires onChange', () => {
    setProvider(provider)

    let brandColor = '#3498db'
    const picker = requireProvider().createPicker({
      value: brandColor,
      format: 'hex',
      presets: ['#3498db', '#e74c3c', '#2ecc71'],
      onChange: (color) => {
        brandColor = color
      },
    })
    expect(picker.getValue()).toBe('#3498db')
    expect(picker.getFormat()).toBe('hex')

    const onSwatchClick = (color: string): void => picker.setValue(color)
    onSwatchClick('#e74c3c')
    expect(picker.getValue()).toBe('#e74c3c')
    expect(brandColor).toBe('#e74c3c')

    picker.destroy()
  })
})
