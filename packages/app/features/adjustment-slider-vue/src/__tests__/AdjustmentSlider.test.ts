// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, type VNodeChild } from 'vue'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .map((c) => (typeof c === 'function' ? c() : c))
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        if (prop === 'sp') return () => ({})
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

import { AdjustmentSlider } from '../AdjustmentSlider.js'
import type { AdjustmentSliderProps } from '../types.js'

/** Tear-downs of the apps mounted by {@link render}, run after each test. */
const mounted: Array<() => void> = []

afterEach(() => {
  for (const dispose of mounted.splice(0)) dispose()
  document.body.innerHTML = ''
})

/**
 * Mounts an {@link AdjustmentSlider} and returns the host container.
 *
 * @param props - The slider's props.
 * @param slots - Optional slot render functions.
 * @returns The container element the app mounted into.
 */
function render(
  props: AdjustmentSliderProps,
  slots?: Record<string, () => VNodeChild[]>,
): HTMLElement {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(AdjustmentSlider, props, slots) }))
  app.mount(host)
  mounted.push(() => {
    app.unmount()
    host.remove()
  })
  return host
}

/**
 * Sets a range input's value and dispatches the native `input` + `change`
 * events a user drag would send.
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

describe('<AdjustmentSlider>', () => {
  it('renders the label, default-formatted value, and a range input', () => {
    const container = render({
      label: 'Brightness',
      value: 25,
      onChange: () => {},
      unit: '%',
    })
    expect(container.textContent).toContain('Brightness')
    // Default formatter: value + unit.
    expect(container.textContent).toContain('25%')
    const input = container.querySelector(
      '[data-mol-id="adjustment-slider-input"]',
    ) as HTMLInputElement
    expect(input).not.toBeNull()
    expect(input.type).toBe('range')
    expect(input.min).toBe('-100')
    expect(input.max).toBe('100')
    expect(input.step).toBe('1')
    expect(input.value).toBe('25')
  })

  it('renders a center mark when bipolar and the range crosses zero', () => {
    const container = render({ label: 'Exposure', value: 0, onChange: () => {} })
    expect(container.querySelector('[data-mol-id="adjustment-slider-center-mark"]')).not.toBeNull()
  })

  it('hides the center mark when bipolar=false', () => {
    const container = render({
      label: 'Volume',
      value: 50,
      onChange: () => {},
      min: 0,
      max: 100,
      bipolar: false,
    })
    expect(container.querySelector('[data-mol-id="adjustment-slider-center-mark"]')).toBeNull()
  })

  it('emits clamped + step-snapped values on input change', () => {
    const onChange = vi.fn<(v: number) => void>()
    const container = render({
      label: 'Saturation',
      value: 0,
      onChange,
      min: -1,
      max: 1,
      step: 0.1,
    })
    const input = container.querySelector(
      '[data-mol-id="adjustment-slider-input"]',
    ) as HTMLInputElement
    typeValue(input, '0.46')
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0]![0]).toBe(0.5)
  })

  it('double-clicking the input resets to 0 in bipolar mode', () => {
    const onChange = vi.fn<(v: number) => void>()
    const container = render({ label: 'Hue', value: 42, onChange })
    const input = container.querySelector(
      '[data-mol-id="adjustment-slider-input"]',
    ) as HTMLInputElement
    input.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    expect(onChange).toHaveBeenCalledWith(0)
  })

  it('double-click resets to min in unipolar mode', () => {
    const onChange = vi.fn<(v: number) => void>()
    const container = render({
      label: 'Volume',
      value: 75,
      onChange,
      min: 0,
      max: 100,
      bipolar: false,
    })
    const input = container.querySelector(
      '[data-mol-id="adjustment-slider-input"]',
    ) as HTMLInputElement
    input.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    expect(onChange).toHaveBeenCalledWith(0)
  })

  it('calls onReset (and skips onChange) when a custom reset handler is supplied', () => {
    const onChange = vi.fn<(v: number) => void>()
    const onReset = vi.fn<() => void>()
    const container = render({ label: 'Tint', value: 20, onChange, onReset })
    const input = container.querySelector(
      '[data-mol-id="adjustment-slider-input"]',
    ) as HTMLInputElement
    input.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    expect(onReset).toHaveBeenCalledTimes(1)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('clicking the value display button triggers reset', () => {
    const onChange = vi.fn<(v: number) => void>()
    const container = render({ label: 'Contrast', value: 15, onChange })
    const resetBtn = container.querySelector(
      '[data-mol-id="adjustment-slider-reset"]',
    ) as HTMLButtonElement
    resetBtn.click()
    expect(onChange).toHaveBeenCalledWith(0)
  })

  it('Shift+ArrowUp nudges by 10x step', () => {
    const onChange = vi.fn<(v: number) => void>()
    const container = render({ label: 'Gain', value: 0, onChange })
    const input = container.querySelector(
      '[data-mol-id="adjustment-slider-input"]',
    ) as HTMLInputElement
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', shiftKey: true }))
    expect(onChange).toHaveBeenCalledWith(10)
  })

  it('Shift+ArrowDown nudges by -10x step', () => {
    const onChange = vi.fn<(v: number) => void>()
    const container = render({ label: 'Gain', value: 0, onChange })
    const input = container.querySelector(
      '[data-mol-id="adjustment-slider-input"]',
    ) as HTMLInputElement
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: true }))
    expect(onChange).toHaveBeenCalledWith(-10)
  })

  it('plain arrow keys are NOT intercepted (native range handles them)', () => {
    const onChange = vi.fn<(v: number) => void>()
    const container = render({ label: 'Gain', value: 0, onChange })
    const input = container.querySelector(
      '[data-mol-id="adjustment-slider-input"]',
    ) as HTMLInputElement
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }))
    // Our handler short-circuits without shift; native onChange would fire
    // separately on real browsers.
    expect(onChange).not.toHaveBeenCalled()
  })

  it('uses the custom format callback over the default unit suffix', () => {
    const container = render({
      label: 'Exposure',
      value: 1.5,
      onChange: () => {},
      format: (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1)} EV`,
    })
    expect(container.textContent).toContain('+1.5 EV')
  })

  it('exposes data-mol-id on the outer container', () => {
    const container = render({
      label: 'Hue',
      value: 0,
      onChange: () => {},
      dataMolId: 'adjustment-slider-hue',
    })
    expect(container.querySelector('[data-mol-id="adjustment-slider-hue"]')).not.toBeNull()
  })

  it('does not emit onChange when the snapped value equals the current value', () => {
    const onChange = vi.fn<(v: number) => void>()
    const container = render({
      label: 'Hue',
      value: 50,
      onChange,
      min: 0,
      max: 100,
      bipolar: false,
    })
    const input = container.querySelector(
      '[data-mol-id="adjustment-slider-input"]',
    ) as HTMLInputElement
    typeValue(input, '50')
    expect(onChange).not.toHaveBeenCalled()
  })
})
