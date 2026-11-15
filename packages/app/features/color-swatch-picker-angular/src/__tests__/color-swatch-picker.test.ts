// @vitest-environment jsdom
/**
 * Unit tests of `ColorSwatchPicker` — the port of
 * `@molecule/app-color-swatch-picker-react/src/__tests__/color-swatch-picker.test.tsx`.
 * The React suite renders the component with mocked UI dependencies and
 * asserts the markup; this port mounts the same mocked tree through Angular's
 * real renderer (the same `createApplication` + JIT host approach the
 * conformance kit's Angular adapter uses) and asserts the same markup
 * strings. jsdom serializes inline styles it is given through the CSSOM
 * (`#ff0000` becomes `rgb(255, 0, 0)`), so the paint assertions check the
 * computed color value.
 *
 * @module
 */

import '@angular/compiler'
import {
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { type ApplicationRef, createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Proxy ClassMap echoing each accessed member back as its token (e.g. `stack`),
// so tests can assert which cm.* class was applied without a real bond.
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
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

const { ColorSwatchPicker } = await import('../color-swatch-picker.component.js')

/** A mounted spec host: its DOM, a props setter, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): Promise<void>
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

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
    changeDetection: ChangeDetectionStrategy.Default,
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

/** The template binding every swatch-prop set the test mounts with. */
const TEMPLATE = (projected = '') =>
  `<div mol-color-swatch-picker [swatches]="p['swatches']" [value]="p['value']" [onChange]="p['onChange']" [size]="p['size']" [gap]="p['gap']" [className]="p['className']" [ariaLabel]="p['ariaLabel']">${projected}</div>`

const mounted: Mounted[] = []

const render = async (props: Record<string, unknown>, projected = ''): Promise<Mounted> => {
  const m = await mount(TEMPLATE(projected), ColorSwatchPicker as Type<unknown>, props)
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

const swatches = [
  { value: 'red', color: '#ff0000', label: 'Red' },
  { value: 'green', color: '#00ff00', label: 'Green' },
  { value: 'blue', color: '#0000ff' },
]

describe('ColorSwatchPicker', () => {
  it('renders one radio button per swatch', async () => {
    const m = await render({ swatches, value: 'red', onChange: () => {} })
    expect(m.host.innerHTML.match(/role="radio"/g) ?? []).toHaveLength(3)
  })

  it('marks the selected swatch aria-checked', async () => {
    const m = await render({ swatches, value: 'green', onChange: () => {} })
    expect(m.host.innerHTML.match(/aria-checked="true"/g) ?? []).toHaveLength(1)
  })

  it('paints each swatch with its color', async () => {
    const m = await render({ swatches, value: 'red', onChange: () => {} })
    // jsdom serializes inline styles through the CSSOM: `#ff0000` becomes
    // `rgb(255, 0, 0)`.
    expect(m.host.innerHTML).toContain('rgb(255, 0, 0)')
    expect(m.host.innerHTML).toContain('rgb(0, 0, 255)')
  })

  it('uses the label as the aria-label, falling back to value', async () => {
    const m = await render({ swatches, value: 'red', onChange: () => {} })
    expect(m.host.innerHTML).toContain('aria-label="Red"')
    expect(m.host.innerHTML).toContain('aria-label="blue"')
  })

  it('renders the preview slot', async () => {
    const m = await render(
      { swatches, value: 'red', onChange: () => {} },
      '<div slot="preview" data-preview></div>',
    )
    expect(m.host.innerHTML).toContain('data-preview')
  })

  it('exposes a radiogroup with the supplied aria-label and forwards className', async () => {
    const m = await render({
      swatches,
      value: 'red',
      onChange: () => {},
      ariaLabel: 'Tag color',
      className: 'csp-cls',
    })
    expect(m.host.innerHTML).toContain('role="radiogroup"')
    expect(m.host.innerHTML).toContain('aria-label="Tag color"')
    expect(m.host.innerHTML).toContain('csp-cls')
  })
})
