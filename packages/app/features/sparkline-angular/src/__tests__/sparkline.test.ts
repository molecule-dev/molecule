// @vitest-environment jsdom
/**
 * Unit tests of `Sparkline` — the port of
 * `@molecule/app-sparkline-react`'s own suite. The React suite renders the
 * component with a mocked ClassMap and asserts the markup; this port mounts
 * the same tree through Angular's real renderer (the same `createApplication`
 * + JIT host approach the conformance kit's Angular adapter uses) and asserts
 * the same markup strings.
 *
 * @module
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `page`), so tests can assert which cm.* class was applied without a real
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
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

const { Sparkline } = await import('../sparkline.component.js')

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

const mounted: Mounted[] = []

/**
 * Mounts the Sparkline through a JIT host template, written exactly the way
 * an Angular app would write it.
 *
 * @param props - The inputs the template binds as `p['name']`.
 * @returns The mounted host.
 */
async function render(props: Record<string, unknown> = {}): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [Sparkline as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `<mol-sparkline [values]="p['values']" [variant]="p['variant']" [width]="p['width']" [height]="p['height']" [color]="p['color']" [ariaLabel]="p['ariaLabel']" [className]="p['className']" />`,
  })(
    class SpecHost {
      /** The inputs the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const ref = createComponent(Host, { environmentInjector: appRef.injector })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  mounted.push({
    host,
    destroy: async () => {
      ref.destroy()
      host.remove()
      await appRef.destroy()
    },
  })
  return mounted[mounted.length - 1]!
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

/**
 * Mounts the Sparkline between two fixed siblings, the way a consumer list
 * would, and returns a setter for its series.
 *
 * @param values - The initial series.
 * @returns The mounted host and a setter that re-renders with a new series.
 */
async function renderInList(values: number[]): Promise<Mounted & { set(next: number[]): void }> {
  const Host = Component({
    selector: 'mol-spec-list-host',
    standalone: true,
    imports: [Sparkline as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `<i>a</i><mol-sparkline [values]="values" /><i>b</i>`,
  })(
    class SpecListHost {
      /** The series the template binds. */
      values = values
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const ref = createComponent(Host, { environmentInjector: appRef.injector })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  mounted.push({
    host,
    destroy: async () => {
      ref.destroy()
      host.remove()
      await appRef.destroy()
    },
  })
  return {
    ...mounted[mounted.length - 1]!,
    set: (next: number[]): void => {
      ref.instance.values = next
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
  }
}

describe('Sparkline', () => {
  it('renders nothing when values is empty', async () => {
    const m = await render({ values: [] })
    expect(m.host.querySelector('svg')).toBeNull()
  })

  it('renders an <svg> with role="img" and a default aria-label', async () => {
    const m = await render({ values: [1, 2, 3] })
    const markup = m.host.innerHTML
    expect(markup).toContain('<svg')
    expect(markup).toContain('role="img"')
    expect(markup).toContain('aria-label="Trend sparkline"')
  })

  it('honours a custom ariaLabel and dimensions', async () => {
    const m = await render({
      values: [1, 2],
      ariaLabel: 'Sales trend',
      width: 120,
      height: 40,
    })
    const markup = m.host.innerHTML
    expect(markup).toContain('aria-label="Sales trend"')
    expect(markup).toContain('width="120"')
    expect(markup).toContain('height="40"')
  })

  it('renders a polyline for the line variant', async () => {
    const m = await render({ values: [1, 5, 2], variant: 'line' })
    expect(m.host.innerHTML).toContain('<polyline')
  })

  it('renders rects for the bar variant', async () => {
    const m = await render({ values: [1, 5, 2], variant: 'bar' })
    expect(m.host.innerHTML).toContain('<rect')
  })

  it('renders circles for the dot variant', async () => {
    const m = await render({ values: [1, 5, 2], variant: 'dot' })
    expect(m.host.innerHTML).toContain('<circle')
  })

  it('applies a custom color and forwards className', async () => {
    const m = await render({ values: [1, 2], color: '#ff0000', className: 'spk-cls' })
    const markup = m.host.innerHTML
    expect(markup).toContain('#ff0000')
    expect(markup).toContain('spk-cls')
  })

  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await renderInList([1, 2, 3])
    const children = (): string[] =>
      Array.from(m.host.children).map((child) => child.tagName.toLowerCase())
    expect(children()).toEqual(['i', 'svg', 'i'])
    m.set([])
    expect(children()).toEqual(['i', 'i'])
    m.set([4, 5])
    expect(children()).toEqual(['i', 'svg', 'i'])
  })
})
