/**
 * Unit tests for `<ColorPicker>` and the color-space helpers it ships.
 *
 * @module
 */

// @vitest-environment jsdom

import { useState } from 'react'

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => ({
    cn: (...args: unknown[]) => args.flat().filter(Boolean).join(' '),
    flex: () => 'flex',
    textSize: () => 'text',
  }),
}))

vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (_key: string, _values?: Record<string, unknown>, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

import { ColorPicker } from '../ColorPicker.js'
import { hexToRgb, hsvToRgb, isValidHex, rgbToHex, rgbToHsv } from '../conversions.js'

afterEach(() => {
  cleanup()
})

describe('color-space conversions', () => {
  it('round-trips RGB → HEX → RGB cleanly', () => {
    expect(rgbToHex({ r: 51, g: 102, b: 255 })).toBe('#3366ff')
    expect(hexToRgb('#3366ff')).toEqual({ r: 51, g: 102, b: 255 })
  })

  it('parses 3-digit hex shortcuts', () => {
    expect(hexToRgb('#abc')).toEqual({ r: 0xaa, g: 0xbb, b: 0xcc })
  })

  it('falls back to black on bad hex input rather than throwing', () => {
    expect(hexToRgb('not-a-color')).toEqual({ r: 0, g: 0, b: 0 })
    expect(hexToRgb('')).toEqual({ r: 0, g: 0, b: 0 })
  })

  it('round-trips RGB → HSV → RGB within rounding', () => {
    const start = { r: 200, g: 50, b: 150 }
    const round = hsvToRgb(rgbToHsv(start))
    expect(round.r).toBeCloseTo(start.r, -0.5)
    expect(round.g).toBeCloseTo(start.g, -0.5)
    expect(round.b).toBeCloseTo(start.b, -0.5)
  })

  it('validates hex strings with and without leading #', () => {
    expect(isValidHex('#3366ff')).toBe(true)
    expect(isValidHex('3366ff')).toBe(true)
    expect(isValidHex('#abc')).toBe(true)
    expect(isValidHex('zzzzzz')).toBe(false)
    expect(isValidHex('#1234')).toBe(false)
  })
})

describe('<ColorPicker>', () => {
  it('renders the swatch, hex input, and HSV/RGB sliders', () => {
    const { container } = render(<ColorPicker value="#3366ff" onChange={() => {}} />)
    expect(container.querySelector('[data-mol-id="color-picker-swatch"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="color-picker-hex"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="color-picker-hue"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="color-picker-saturation"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="color-picker-value"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="color-picker-r"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="color-picker-g"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="color-picker-b"]')).not.toBeNull()
  })

  it('shows the current color in the hex input', () => {
    render(<ColorPicker value="#abcdef" onChange={() => {}} />)
    const hex = screen.getByLabelText('HEX color') as HTMLInputElement
    expect(hex.value.toLowerCase()).toBe('#abcdef')
  })

  it('emits a normalized hex when an RGB channel changes', () => {
    const onChange = vi.fn()
    const { container } = render(<ColorPicker value="#000000" onChange={onChange} />)
    const r = container.querySelector('[data-mol-id="color-picker-r"]') as HTMLInputElement
    fireEvent.change(r, { target: { value: '255' } })
    expect(onChange).toHaveBeenCalledWith('#ff0000')
  })

  it('emits a hex when the hue slider moves', () => {
    const onChange = vi.fn()
    const { container } = render(<ColorPicker value="#ff0000" onChange={onChange} />)
    const hue = container.querySelector('[data-mol-id="color-picker-hue"]') as HTMLInputElement
    fireEvent.change(hue, { target: { value: '120' } })
    // Pure-green slot at h=120, s=1, v=1.
    expect(onChange).toHaveBeenCalledWith('#00ff00')
  })

  it('emits a hex when the value/brightness slider moves', () => {
    const onChange = vi.fn()
    const { container } = render(<ColorPicker value="#ffffff" onChange={onChange} />)
    const v = container.querySelector('[data-mol-id="color-picker-value"]') as HTMLInputElement
    fireEvent.change(v, { target: { value: '0' } })
    expect(onChange).toHaveBeenCalledWith('#000000')
  })

  it('commits a typed hex value on Enter', () => {
    const onChange = vi.fn()
    const { container } = render(<ColorPicker value="#000000" onChange={onChange} />)
    const hex = container.querySelector('[data-mol-id="color-picker-hex"]') as HTMLInputElement
    fireEvent.change(hex, { target: { value: '#abcdef' } })
    fireEvent.keyDown(hex, { key: 'Enter' })
    expect(onChange).toHaveBeenLastCalledWith('#abcdef')
  })

  it('commits a typed hex value on blur', () => {
    const onChange = vi.fn()
    const { container } = render(<ColorPicker value="#000000" onChange={onChange} />)
    const hex = container.querySelector('[data-mol-id="color-picker-hex"]') as HTMLInputElement
    fireEvent.change(hex, { target: { value: '#112233' } })
    fireEvent.blur(hex)
    expect(onChange).toHaveBeenLastCalledWith('#112233')
  })

  it('does not emit when the user types invalid hex', () => {
    const onChange = vi.fn()
    const { container } = render(<ColorPicker value="#000000" onChange={onChange} />)
    const hex = container.querySelector('[data-mol-id="color-picker-hex"]') as HTMLInputElement
    fireEvent.change(hex, { target: { value: 'notacolor' } })
    fireEvent.blur(hex)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('reflects parent-driven value updates in controlled mode', () => {
    function Host() {
      const [c, setC] = useState('#000000')
      return (
        <div>
          <button onClick={() => setC('#ff00ff')}>set</button>
          <ColorPicker value={c} onChange={setC} />
        </div>
      )
    }
    render(<Host />)
    fireEvent.click(screen.getByText('set'))
    const hex = screen.getByLabelText('HEX color') as HTMLInputElement
    expect(hex.value.toLowerCase()).toBe('#ff00ff')
  })

  it('forwards dataMolId for agent automation', () => {
    const { container } = render(
      <ColorPicker dataMolId="stroke-color" value="#000000" onChange={() => {}} />,
    )
    expect(container.querySelector('[data-mol-id="stroke-color"]')).not.toBeNull()
  })
})
