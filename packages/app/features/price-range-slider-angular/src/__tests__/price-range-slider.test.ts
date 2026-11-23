// @vitest-environment jsdom
/**
 * Unit tests for `PriceRangeSlider` — the port of
 * `@molecule/app-price-range-slider-react`'s own suite. The React suite
 * renders the component with mocked UI dependencies and asserts the markup;
 * this port mounts the same mocked tree through Angular's real renderer (the
 * same `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) and asserts the same markup strings.
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

import { provideDomPlacement } from '@molecule/app-angular'

// Proxy ClassMap echoing each accessed member back as its token (e.g. `stack`),
// so tests can assert which cm.* class was applied without a real bond — the
// same mock the React package's own tests use.
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

const { PriceRangeSlider } = await import('../price-range-slider.component.js')

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
  `[min]="p['min']" [max]="p['max']" [value]="p['value']" [step]="p['step']"` +
  ` [formatValue]="p['formatValue']" [label]="p['label']" [className]="p['className']" [onChange]="p['onChange']"`

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
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
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

const mounted: Mounted[] = []

/**
 * Renders the slider with the given props and projected label content.
 *
 * @param props - The props object the template binds.
 * @param projected - Extra projected content inside the component element.
 * @returns The mounted host.
 */
const render = async (props: Record<string, unknown> = {}, projected = ''): Promise<Mounted> => {
  const m = await mount(
    `<div mol-price-range-slider ${BINDINGS}>${projected}</div>`,
    PriceRangeSlider as Type<unknown>,
    props,
  )
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('PriceRangeSlider', () => {
  it('keeps a consumer list in order when an item is inserted in the middle of label', async () => {
    const m = await render(
      { min: 0, max: 100, value: [20, 80], xs: [1, 3] },
      '@for (x of p[\'xs\']; track x) {<b slot="label">{{ x }}</b>}',
    )
    const texts = (): string[] =>
      Array.from(m.host.querySelectorAll('span b')).map((el) => el.textContent ?? '')
    expect(texts()).toEqual(['1', '3'])
    await m.setProps({ xs: [1, 2, 3] })
    expect(texts()).toEqual(['1', '2', '3'])
    await m.setProps({ xs: [1, 3] })
    expect(texts()).toEqual(['1', '3'])
  })

  it('renders two range inputs with min/max aria-labels', async () => {
    const m = await render({ min: 0, max: 100, value: [20, 80], onChange: () => {} })
    const markup = m.host.innerHTML
    expect(markup.match(/type="range"/g) ?? []).toHaveLength(2)
    expect(markup).toContain('aria-label="Minimum"')
    expect(markup).toContain('aria-label="Maximum"')
  })

  it('reflects the value tuple on the two range inputs', async () => {
    const m = await render({ min: 0, max: 100, value: [25, 75], onChange: () => {} })
    const markup = m.host.innerHTML
    expect(markup).toContain('value="25"')
    expect(markup).toContain('value="75"')
  })

  it('formats the endpoint labels as USD currency by default', async () => {
    const m = await render({ min: 0, max: 5000, value: [1000, 4000], onChange: () => {} })
    const markup = m.host.innerHTML
    expect(markup).toContain('$1,000')
    expect(markup).toContain('$4,000')
  })

  it('uses a custom formatValue when supplied', async () => {
    const m = await render({
      min: 0,
      max: 100,
      value: [10, 90],
      onChange: () => {},
      formatValue: (n: number) => `${n}pts`,
    })
    const markup = m.host.innerHTML
    expect(markup).toContain('10pts')
    expect(markup).toContain('90pts')
  })

  it('renders the label when present and omits it otherwise', async () => {
    const withLabel = await render(
      { min: 0, max: 10, value: [1, 9], onChange: () => {} },
      `<strong slot="label">Price range</strong>`,
    )
    expect(withLabel.host.innerHTML).toContain('Price range')
    const withoutLabel = await render({ min: 0, max: 10, value: [1, 9], onChange: () => {} })
    expect(withoutLabel.host.innerHTML).not.toContain('Price range')
  })

  it('forwards className', async () => {
    const m = await render({
      min: 0,
      max: 10,
      value: [1, 9],
      onChange: () => {},
      className: 'prs-cls',
    })
    expect(m.host.innerHTML).toContain('prs-cls')
  })

  it('shows and removes the label wrapper in the pass where the consumer @if adds and removes its content', async () => {
    const m = await render(
      { min: 0, max: 10, value: [1, 9], onChange: () => {}, on: false },
      `@if (p['on']) {<strong slot="label" data-label>Price range</strong>}`,
    )
    const label = (): HTMLElement | null => m.host.querySelector('[data-label]')
    // No label input and no projected node: React renders no `<span>` wrapper.
    expect(label()).toBeNull()
    await m.setProps({ on: true })
    expect(label()).not.toBeNull()
    expect(label()?.parentElement?.tagName).toBe('SPAN')
    expect(label()?.parentElement?.isConnected).toBe(true)
    await m.setProps({ on: false })
    expect(label()).toBeNull()
  })
})
