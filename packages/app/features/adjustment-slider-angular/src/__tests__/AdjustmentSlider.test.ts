// @vitest-environment jsdom

import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

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

const { AdjustmentSlider } = await import('../adjustment-slider.component.js')

/** A mounted spec host: its DOM, a props setter, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): Promise<void>
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/** The input bindings the spec host template writes onto the component. */
const BINDINGS =
  `[label]="p['label']" [value]="p['value']" [onChange]="p['onChange']" [onReset]="p['onReset']"` +
  ` [min]="p['min']" [max]="p['max']" [step]="p['step']" [bipolar]="p['bipolar']"` +
  ` [unit]="p['unit']" [format]="p['format']" [className]="p['className']" [dataMolId]="p['dataMolId']"`

/**
 * Mounts one standalone component through a JIT host template, written
 * exactly the way an Angular app would write it.
 *
 * @param template - The host template (the component element + projected content).
 * @param component - The component class under test.
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(
  template: string,
  component: Type<unknown>,
  props: Record<string, unknown> = {},
): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [component],
    changeDetection: ChangeDetectionStrategy.Eager,
    template,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref: ComponentRef<{ p: Record<string, unknown> }> = createComponent(Host, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  return {
    host,
    setProps: async (next: Record<string, unknown>) => {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

/** The mounts created by {@link render}, destroyed after each test. */
const mounted: Mounted[] = []

/**
 * Renders the slider with the given props.
 *
 * @param props - The props object the template binds.
 * @returns The mounted host.
 */
const render = async (props: Record<string, unknown> = {}): Promise<Mounted> => {
  const m = await mount(
    `<div mol-adjustment-slider ${BINDINGS}></div>`,
    AdjustmentSlider as Type<unknown>,
    props,
  )
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
})

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
  it('renders the label, default-formatted value, and a range input', async () => {
    const m = await render({ label: 'Brightness', value: 25, onChange: () => {}, unit: '%' })
    expect(m.host.textContent).toContain('Brightness')
    // Default formatter: value + unit.
    expect(m.host.textContent).toContain('25%')
    const input = m.host.querySelector(
      '[data-mol-id="adjustment-slider-input"]',
    ) as HTMLInputElement
    expect(input).not.toBeNull()
    expect(input.type).toBe('range')
    expect(input.min).toBe('-100')
    expect(input.max).toBe('100')
    expect(input.step).toBe('1')
    expect(input.value).toBe('25')
  })

  it('renders a center mark when bipolar and the range crosses zero', async () => {
    const m = await render({ label: 'Exposure', value: 0, onChange: () => {} })
    expect(m.host.querySelector('[data-mol-id="adjustment-slider-center-mark"]')).not.toBeNull()
  })

  it('hides the center mark when bipolar=false', async () => {
    const m = await render({
      label: 'Volume',
      value: 50,
      onChange: () => {},
      min: 0,
      max: 100,
      bipolar: false,
    })
    expect(m.host.querySelector('[data-mol-id="adjustment-slider-center-mark"]')).toBeNull()
  })

  it('emits clamped + step-snapped values on input change', async () => {
    const onChange = vi.fn<(v: number) => void>()
    const m = await render({
      label: 'Saturation',
      value: 0,
      onChange,
      min: -1,
      max: 1,
      step: 0.1,
    })
    const input = m.host.querySelector(
      '[data-mol-id="adjustment-slider-input"]',
    ) as HTMLInputElement
    typeValue(input, '0.46')
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0]![0]).toBe(0.5)
  })

  it('double-clicking the input resets to 0 in bipolar mode', async () => {
    const onChange = vi.fn<(v: number) => void>()
    const m = await render({ label: 'Hue', value: 42, onChange })
    const input = m.host.querySelector(
      '[data-mol-id="adjustment-slider-input"]',
    ) as HTMLInputElement
    input.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    expect(onChange).toHaveBeenCalledWith(0)
  })

  it('double-click resets to min in unipolar mode', async () => {
    const onChange = vi.fn<(v: number) => void>()
    const m = await render({
      label: 'Volume',
      value: 75,
      onChange,
      min: 0,
      max: 100,
      bipolar: false,
    })
    const input = m.host.querySelector(
      '[data-mol-id="adjustment-slider-input"]',
    ) as HTMLInputElement
    input.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    expect(onChange).toHaveBeenCalledWith(0)
  })

  it('calls onReset (and skips onChange) when a custom reset handler is supplied', async () => {
    const onChange = vi.fn<(v: number) => void>()
    const onReset = vi.fn<() => void>()
    const m = await render({ label: 'Tint', value: 20, onChange, onReset })
    const input = m.host.querySelector(
      '[data-mol-id="adjustment-slider-input"]',
    ) as HTMLInputElement
    input.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    expect(onReset).toHaveBeenCalledTimes(1)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('clicking the value display button triggers reset', async () => {
    const onChange = vi.fn<(v: number) => void>()
    const m = await render({ label: 'Contrast', value: 15, onChange })
    const resetBtn = m.host.querySelector(
      '[data-mol-id="adjustment-slider-reset"]',
    ) as HTMLButtonElement
    resetBtn.click()
    expect(onChange).toHaveBeenCalledWith(0)
  })

  it('Shift+ArrowUp nudges by 10x step', async () => {
    const onChange = vi.fn<(v: number) => void>()
    const m = await render({ label: 'Gain', value: 0, onChange })
    const input = m.host.querySelector(
      '[data-mol-id="adjustment-slider-input"]',
    ) as HTMLInputElement
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', shiftKey: true }))
    expect(onChange).toHaveBeenCalledWith(10)
  })

  it('Shift+ArrowDown nudges by -10x step', async () => {
    const onChange = vi.fn<(v: number) => void>()
    const m = await render({ label: 'Gain', value: 0, onChange })
    const input = m.host.querySelector(
      '[data-mol-id="adjustment-slider-input"]',
    ) as HTMLInputElement
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: true }))
    expect(onChange).toHaveBeenCalledWith(-10)
  })

  it('plain arrow keys are NOT intercepted (native range handles them)', async () => {
    const onChange = vi.fn<(v: number) => void>()
    const m = await render({ label: 'Gain', value: 0, onChange })
    const input = m.host.querySelector(
      '[data-mol-id="adjustment-slider-input"]',
    ) as HTMLInputElement
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }))
    // Our handler short-circuits without shift; native onChange would fire
    // separately on real browsers.
    expect(onChange).not.toHaveBeenCalled()
  })

  it('uses the custom format callback over the default unit suffix', async () => {
    const m = await render({
      label: 'Exposure',
      value: 1.5,
      onChange: () => {},
      format: (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1)} EV`,
    })
    expect(m.host.textContent).toContain('+1.5 EV')
  })

  it('exposes data-mol-id on the outer container', async () => {
    const m = await render({
      label: 'Hue',
      value: 0,
      onChange: () => {},
      dataMolId: 'adjustment-slider-hue',
    })
    expect(m.host.querySelector('[data-mol-id="adjustment-slider-hue"]')).not.toBeNull()
  })

  it('does not emit onChange when the snapped value equals the current value', async () => {
    const onChange = vi.fn<(v: number) => void>()
    const m = await render({
      label: 'Hue',
      value: 50,
      onChange,
      min: 0,
      max: 100,
      bipolar: false,
    })
    const input = m.host.querySelector(
      '[data-mol-id="adjustment-slider-input"]',
    ) as HTMLInputElement
    typeValue(input, '50')
    expect(onChange).not.toHaveBeenCalled()
  })
})
