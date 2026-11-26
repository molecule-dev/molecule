// @vitest-environment jsdom
/**
 * Unit tests for the Angular `<ColorPicker>` and the color-space helpers it
 * ships — a port of `@molecule/app-color-picker-react/src/__tests__/ColorPicker.test.tsx`:
 * the same test names and behavioral assertions, mounted through Angular's
 * real renderer (the JIT host approach the conformance kit's Angular adapter
 * uses).
 *
 * @module
 */

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

// The same ClassMap mock the React tests use: enough of the map for the
// component's class composition, without a real bond.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () => ({
    cn: (...args: unknown[]) => args.flat().filter(Boolean).join(' '),
    flex: () => 'flex',
    textSize: () => 'text',
  }),
}))

const { ColorPicker } = await import('../color-picker.component.js')
const { hexToRgb, hsvToRgb, isValidHex, rgbToHex, rgbToHsv } = await import('../conversions.js')

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
  `[value]="p['value']" [onChange]="p['onChange']"` +
  ` [dataMolId]="p['dataMolId']" [className]="p['className']"`

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
 * Renders the picker with the given props.
 *
 * @param props - The props object the template binds.
 * @returns The mounted host.
 */
const render = async (props: Record<string, unknown> = {}): Promise<Mounted> => {
  const m = await mount(
    `<div mol-color-picker ${BINDINGS}></div>`,
    ColorPicker as Type<unknown>,
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
  it('renders the swatch, hex input, and HSV/RGB sliders', async () => {
    const m = await render({ value: '#3366ff', onChange: () => {} })
    expect(m.host.querySelector('[data-mol-id="color-picker-swatch"]')).not.toBeNull()
    expect(m.host.querySelector('[data-mol-id="color-picker-hex"]')).not.toBeNull()
    expect(m.host.querySelector('[data-mol-id="color-picker-hue"]')).not.toBeNull()
    expect(m.host.querySelector('[data-mol-id="color-picker-saturation"]')).not.toBeNull()
    expect(m.host.querySelector('[data-mol-id="color-picker-value"]')).not.toBeNull()
    expect(m.host.querySelector('[data-mol-id="color-picker-r"]')).not.toBeNull()
    expect(m.host.querySelector('[data-mol-id="color-picker-g"]')).not.toBeNull()
    expect(m.host.querySelector('[data-mol-id="color-picker-b"]')).not.toBeNull()
  })

  it('shows the current color in the hex input', async () => {
    const m = await render({ value: '#abcdef', onChange: () => {} })
    const hex = m.host.querySelector('[data-mol-id="color-picker-hex"]') as HTMLInputElement
    expect(hex.value.toLowerCase()).toBe('#abcdef')
  })

  it('emits a normalized hex when an RGB channel changes', async () => {
    const onChange = vi.fn()
    const m = await render({ value: '#000000', onChange })
    const r = m.host.querySelector('[data-mol-id="color-picker-r"]') as HTMLInputElement
    typeValue(r, '255')
    expect(onChange).toHaveBeenCalledWith('#ff0000')
  })

  it('emits a hex when the hue slider moves', async () => {
    const onChange = vi.fn()
    const m = await render({ value: '#ff0000', onChange })
    const hue = m.host.querySelector('[data-mol-id="color-picker-hue"]') as HTMLInputElement
    typeValue(hue, '120')
    // Pure-green slot at h=120, s=1, v=1.
    expect(onChange).toHaveBeenCalledWith('#00ff00')
  })

  it('emits a hex when the value/brightness slider moves', async () => {
    const onChange = vi.fn()
    const m = await render({ value: '#ffffff', onChange })
    const v = m.host.querySelector('[data-mol-id="color-picker-value"]') as HTMLInputElement
    typeValue(v, '0')
    expect(onChange).toHaveBeenCalledWith('#000000')
  })

  it('commits a typed hex value on Enter', async () => {
    const onChange = vi.fn()
    const m = await render({ value: '#000000', onChange })
    const hex = m.host.querySelector('[data-mol-id="color-picker-hex"]') as HTMLInputElement
    typeValue(hex, '#abcdef')
    hex.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(onChange).toHaveBeenLastCalledWith('#abcdef')
  })

  it('commits a typed hex value on blur', async () => {
    const onChange = vi.fn()
    const m = await render({ value: '#000000', onChange })
    const hex = m.host.querySelector('[data-mol-id="color-picker-hex"]') as HTMLInputElement
    typeValue(hex, '#112233')
    blur(hex)
    expect(onChange).toHaveBeenLastCalledWith('#112233')
  })

  it('does not emit when the user types invalid hex', async () => {
    const onChange = vi.fn()
    const m = await render({ value: '#000000', onChange })
    const hex = m.host.querySelector('[data-mol-id="color-picker-hex"]') as HTMLInputElement
    typeValue(hex, 'notacolor')
    blur(hex)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('reflects parent-driven value updates in controlled mode', async () => {
    const m = await render({ value: '#000000', onChange: () => {} })
    await m.setProps({ value: '#ff00ff' })
    const hex = m.host.querySelector('[data-mol-id="color-picker-hex"]') as HTMLInputElement
    expect(hex.value.toLowerCase()).toBe('#ff00ff')
  })

  it('forwards dataMolId for agent automation', async () => {
    const m = await render({ dataMolId: 'stroke-color', value: '#000000', onChange: () => {} })
    expect(m.host.querySelector('[data-mol-id="stroke-color"]')).not.toBeNull()
  })
})
