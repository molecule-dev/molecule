// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `<ColorPicker>` and the color-space helpers it
 * ships — a port of `@molecule/app-color-picker-react/src/__tests__/ColorPicker.test.tsx`:
 * the same test names and behavioral assertions, rendered with Svelte in jsdom.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

// The same ClassMap mock the React tests use: enough of the map for the
// component's class composition, without a real bond.
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => ({
    cn: (...args: unknown[]) => args.flat().filter(Boolean).join(' '),
    flex: () => 'flex',
    textSize: () => 'text',
  }),
}))

import ColorPicker from '../ColorPicker.svelte'
import { hexToRgb, hsvToRgb, isValidHex, rgbToHex, rgbToHsv } from '../conversions.js'
import ControlledHost from './ControlledHost.svelte'

/** The mounted roots, unmounted after each test. */
const mounted: Array<ReturnType<typeof mount>> = []

afterEach(async () => {
  for (const instance of mounted.splice(0)) await unmount(instance)
  document.body.innerHTML = ''
})

/**
 * Mounts a component and returns the host container.
 *
 * @param component - The Svelte component to mount.
 * @param props - Its props.
 * @returns The container element the component mounted into.
 */
function render(
  component: typeof ColorPicker | typeof ControlledHost,
  props: Record<string, unknown> = {},
): HTMLElement {
  const host = document.createElement('div')
  document.body.appendChild(host)
  mounted.push(mount(component, { target: host, props }))
  flushSync()
  return host
}

/**
 * Sets an input's value and dispatches the native `input` + `change` events a
 * user edit sends.
 *
 * @param input - The input element.
 * @param value - The new value string.
 */
function typeValue(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

/**
 * Focuses then blurs an input, as clicking away does.
 *
 * @param input - The input element.
 */
function blur(input: HTMLInputElement): void {
  input.focus()
  input.blur()
}

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
    const container = render(ColorPicker, { value: '#3366ff', onChange: () => {} })
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
    const container = render(ColorPicker, { value: '#abcdef', onChange: () => {} })
    const hex = container.querySelector('[data-mol-id="color-picker-hex"]') as HTMLInputElement
    expect(hex.value.toLowerCase()).toBe('#abcdef')
  })

  it('emits a normalized hex when an RGB channel changes', () => {
    const onChange = vi.fn()
    const container = render(ColorPicker, { value: '#000000', onChange })
    const r = container.querySelector('[data-mol-id="color-picker-r"]') as HTMLInputElement
    typeValue(r, '255')
    expect(onChange).toHaveBeenCalledWith('#ff0000')
  })

  it('emits a hex when the hue slider moves', () => {
    const onChange = vi.fn()
    const container = render(ColorPicker, { value: '#ff0000', onChange })
    const hue = container.querySelector('[data-mol-id="color-picker-hue"]') as HTMLInputElement
    typeValue(hue, '120')
    // Pure-green slot at h=120, s=1, v=1.
    expect(onChange).toHaveBeenCalledWith('#00ff00')
  })

  it('emits a hex when the value/brightness slider moves', () => {
    const onChange = vi.fn()
    const container = render(ColorPicker, { value: '#ffffff', onChange })
    const v = container.querySelector('[data-mol-id="color-picker-value"]') as HTMLInputElement
    typeValue(v, '0')
    expect(onChange).toHaveBeenCalledWith('#000000')
  })

  it('commits a typed hex value on Enter', () => {
    const onChange = vi.fn()
    const container = render(ColorPicker, { value: '#000000', onChange })
    const hex = container.querySelector('[data-mol-id="color-picker-hex"]') as HTMLInputElement
    typeValue(hex, '#abcdef')
    hex.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(onChange).toHaveBeenLastCalledWith('#abcdef')
  })

  it('commits a typed hex value on blur', () => {
    const onChange = vi.fn()
    const container = render(ColorPicker, { value: '#000000', onChange })
    const hex = container.querySelector('[data-mol-id="color-picker-hex"]') as HTMLInputElement
    typeValue(hex, '#112233')
    blur(hex)
    expect(onChange).toHaveBeenLastCalledWith('#112233')
  })

  it('does not emit when the user types invalid hex', () => {
    const onChange = vi.fn()
    const container = render(ColorPicker, { value: '#000000', onChange })
    const hex = container.querySelector('[data-mol-id="color-picker-hex"]') as HTMLInputElement
    typeValue(hex, 'notacolor')
    blur(hex)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('reflects parent-driven value updates in controlled mode', () => {
    const container = render(ControlledHost)
    const button = container.querySelector('button') as HTMLButtonElement
    button.click()
    flushSync()
    const hex = container.querySelector('[data-mol-id="color-picker-hex"]') as HTMLInputElement
    expect(hex.value.toLowerCase()).toBe('#ff00ff')
  })

  it('forwards dataMolId for agent automation', () => {
    const container = render(ColorPicker, {
      dataMolId: 'stroke-color',
      value: '#000000',
      onChange: () => {},
    })
    expect(container.querySelector('[data-mol-id="stroke-color"]')).not.toBeNull()
  })
})
