// @vitest-environment jsdom

import { fireEvent, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import { AdjustmentSlider } from '../AdjustmentSlider.js'

/**
 * Build a UIClassMap stub via Proxy: `cn(...)` joins truthy strings,
 * `sp(...)` returns an empty style object, every other property/method
 * access returns its key as a string token.
 *
 * @returns A stub UIClassMap suitable for tests.
 */
function buildStubClassMap(): UIClassMap {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop): unknown {
      if (prop === 'cn') {
        return (...classes: unknown[]) =>
          classes.filter((c) => typeof c === 'string' && c.length > 0).join(' ')
      }
      if (prop === 'sp') return () => ({})
      const token = String(prop)
      const fn = (..._args: unknown[]) => token
      return new Proxy(fn, {
        get(_t, key) {
          if (key === Symbol.toPrimitive || key === 'toString') return () => token
          return undefined
        },
      })
    },
  }
  return new Proxy({}, handler) as unknown as UIClassMap
}

/**
 * Wrap children in I18nProvider so `useTranslation()` works.
 *
 * @param props - Wrapper props.
 * @param props.children - Children to wrap.
 * @returns The wrapped element tree.
 */
function Wrap({ children }: { children: ReactNode }): React.ReactElement {
  return <I18nProvider provider={createSimpleI18nProvider('en')}>{children}</I18nProvider>
}

beforeEach(() => {
  setClassMap(buildStubClassMap())
})

describe('<AdjustmentSlider>', () => {
  it('renders the label, default-formatted value, and a range input', () => {
    const { container, getByText } = render(
      <Wrap>
        <AdjustmentSlider label="Brightness" value={25} onChange={() => {}} unit="%" />
      </Wrap>,
    )
    expect(getByText('Brightness')).toBeTruthy()
    // Default formatter: value + unit.
    expect(getByText('25%')).toBeTruthy()
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
    const { container } = render(
      <Wrap>
        <AdjustmentSlider label="Exposure" value={0} onChange={() => {}} />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="adjustment-slider-center-mark"]')).not.toBeNull()
  })

  it('hides the center mark when bipolar=false', () => {
    const { container } = render(
      <Wrap>
        <AdjustmentSlider
          label="Volume"
          value={50}
          onChange={() => {}}
          min={0}
          max={100}
          bipolar={false}
        />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="adjustment-slider-center-mark"]')).toBeNull()
  })

  it('emits clamped + step-snapped values on input change', () => {
    const onChange = vi.fn<(v: number) => void>()
    const { container } = render(
      <Wrap>
        <AdjustmentSlider
          label="Saturation"
          value={0}
          onChange={onChange}
          min={-1}
          max={1}
          step={0.1}
        />
      </Wrap>,
    )
    const input = container.querySelector(
      '[data-mol-id="adjustment-slider-input"]',
    ) as HTMLInputElement
    fireEvent.change(input, { target: { value: '0.46' } })
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0]).toBe(0.5)
  })

  it('double-clicking the input resets to 0 in bipolar mode', () => {
    const onChange = vi.fn<(v: number) => void>()
    const { container } = render(
      <Wrap>
        <AdjustmentSlider label="Hue" value={42} onChange={onChange} />
      </Wrap>,
    )
    const input = container.querySelector(
      '[data-mol-id="adjustment-slider-input"]',
    ) as HTMLInputElement
    fireEvent.doubleClick(input)
    expect(onChange).toHaveBeenCalledWith(0)
  })

  it('double-click resets to min in unipolar mode', () => {
    const onChange = vi.fn<(v: number) => void>()
    const { container } = render(
      <Wrap>
        <AdjustmentSlider
          label="Volume"
          value={75}
          onChange={onChange}
          min={0}
          max={100}
          bipolar={false}
        />
      </Wrap>,
    )
    const input = container.querySelector(
      '[data-mol-id="adjustment-slider-input"]',
    ) as HTMLInputElement
    fireEvent.doubleClick(input)
    expect(onChange).toHaveBeenCalledWith(0)
  })

  it('calls onReset (and skips onChange) when a custom reset handler is supplied', () => {
    const onChange = vi.fn<(v: number) => void>()
    const onReset = vi.fn<() => void>()
    const { container } = render(
      <Wrap>
        <AdjustmentSlider label="Tint" value={20} onChange={onChange} onReset={onReset} />
      </Wrap>,
    )
    const input = container.querySelector(
      '[data-mol-id="adjustment-slider-input"]',
    ) as HTMLInputElement
    fireEvent.doubleClick(input)
    expect(onReset).toHaveBeenCalledTimes(1)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('clicking the value display button triggers reset', () => {
    const onChange = vi.fn<(v: number) => void>()
    const { container } = render(
      <Wrap>
        <AdjustmentSlider label="Contrast" value={15} onChange={onChange} />
      </Wrap>,
    )
    const resetBtn = container.querySelector(
      '[data-mol-id="adjustment-slider-reset"]',
    ) as HTMLButtonElement
    fireEvent.click(resetBtn)
    expect(onChange).toHaveBeenCalledWith(0)
  })

  it('Shift+ArrowUp nudges by 10x step', () => {
    const onChange = vi.fn<(v: number) => void>()
    const { container } = render(
      <Wrap>
        <AdjustmentSlider label="Gain" value={0} onChange={onChange} />
      </Wrap>,
    )
    const input = container.querySelector(
      '[data-mol-id="adjustment-slider-input"]',
    ) as HTMLInputElement
    fireEvent.keyDown(input, { key: 'ArrowUp', shiftKey: true })
    expect(onChange).toHaveBeenCalledWith(10)
  })

  it('Shift+ArrowDown nudges by -10x step', () => {
    const onChange = vi.fn<(v: number) => void>()
    const { container } = render(
      <Wrap>
        <AdjustmentSlider label="Gain" value={0} onChange={onChange} />
      </Wrap>,
    )
    const input = container.querySelector(
      '[data-mol-id="adjustment-slider-input"]',
    ) as HTMLInputElement
    fireEvent.keyDown(input, { key: 'ArrowDown', shiftKey: true })
    expect(onChange).toHaveBeenCalledWith(-10)
  })

  it('plain arrow keys are NOT intercepted (native range handles them)', () => {
    const onChange = vi.fn<(v: number) => void>()
    const { container } = render(
      <Wrap>
        <AdjustmentSlider label="Gain" value={0} onChange={onChange} />
      </Wrap>,
    )
    const input = container.querySelector(
      '[data-mol-id="adjustment-slider-input"]',
    ) as HTMLInputElement
    fireEvent.keyDown(input, { key: 'ArrowUp' })
    // Our handler short-circuits without shift; native onChange would fire
    // separately on real browsers.
    expect(onChange).not.toHaveBeenCalled()
  })

  it('uses the custom format callback over the default unit suffix', () => {
    const { getByText } = render(
      <Wrap>
        <AdjustmentSlider
          label="Exposure"
          value={1.5}
          onChange={() => {}}
          format={(n) => `${n > 0 ? '+' : ''}${n.toFixed(1)} EV`}
        />
      </Wrap>,
    )
    expect(getByText('+1.5 EV')).toBeTruthy()
  })

  it('exposes data-mol-id on the outer container', () => {
    const { container } = render(
      <Wrap>
        <AdjustmentSlider
          label="Hue"
          value={0}
          onChange={() => {}}
          dataMolId="adjustment-slider-hue"
        />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="adjustment-slider-hue"]')).not.toBeNull()
  })

  it('does not emit onChange when the snapped value equals the current value', () => {
    const onChange = vi.fn<(v: number) => void>()
    const { container } = render(
      <Wrap>
        <AdjustmentSlider
          label="Hue"
          value={50}
          onChange={onChange}
          min={0}
          max={100}
          bipolar={false}
        />
      </Wrap>,
    )
    const input = container.querySelector(
      '[data-mol-id="adjustment-slider-input"]',
    ) as HTMLInputElement
    fireEvent.change(input, { target: { value: '50' } })
    expect(onChange).not.toHaveBeenCalled()
  })
})
