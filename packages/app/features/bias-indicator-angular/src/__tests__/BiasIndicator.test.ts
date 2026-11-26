// @vitest-environment jsdom
/**
 * Unit tests of `BiasIndicator` — the port of
 * `@molecule/app-bias-indicator-react`'s own suite: the same test names and
 * the same assertions. Like the React suite, it mocks the ClassMap so the
 * tokens the component applies are observable, and mounts through Angular's
 * real renderer (the same `createApplication` + JIT host approach the
 * conformance kit's Angular adapter uses).
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
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Proxy ClassMap echoing each accessed member back as its token (e.g. `flex`),
// so tests can assert which cm.* class was applied without a real bond — the
// same mock the React suite uses.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

import { provideDomPlacement } from '@molecule/app-angular'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

const {
  BiasIndicator,
  biasToBucket,
  biasToPercent,
  bucketColor,
  clamp,
  reliabilityToTier,
  tierColor,
} = await import('../bias-indicator.component.js')

/** The host template: every input bound from `p`, plus an optional caption. */
const TEMPLATE = `<mol-bias-indicator [bias]="p['bias']" [reliability]="p['reliability']" [compact]="p['compact']" [className]="p['className']" [dataMolId]="p['dataMolId']"></mol-bias-indicator>`

/** The host template with a projected source caption. */
const TEMPLATE_WITH_SOURCE = `<mol-bias-indicator [bias]="p['bias']" [reliability]="p['reliability']" [compact]="p['compact']" [className]="p['className']" [dataMolId]="p['dataMolId']"><ng-container ngProjectAs="[slot=sourceLabel]">Reuters</ng-container></mol-bias-indicator>`

/** A mounted spec host: its DOM, a props setter, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): Promise<void>
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

const mounted: Mounted[] = []

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider('en'))
})

/**
 * Mounts a {@link BiasIndicator} through a JIT host template and remembers it
 * for teardown.
 *
 * @param props - The props the host template reads as `p['name']`.
 * @param template - The host template (defaults to the plain one).
 * @returns The mounted host.
 */
const mountIndicator = async (
  props: Record<string, unknown>,
  template: string = TEMPLATE,
): Promise<Mounted> => {
  setProvider(createSimpleI18nProvider('en'))
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [BiasIndicator],
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
  const entry: Mounted = {
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
  mounted.push(entry)
  return entry
}

describe('clamp', () => {
  it('returns value within range unchanged', () => {
    expect(clamp(0.3, -1, 1)).toBe(0.3)
  })
  it('clamps below min', () => {
    expect(clamp(-2, -1, 1)).toBe(-1)
  })
  it('clamps above max', () => {
    expect(clamp(2, -1, 1)).toBe(1)
  })
  it('returns min for NaN', () => {
    expect(clamp(Number.NaN, -1, 1)).toBe(-1)
  })
})

describe('biasToBucket', () => {
  it('classifies far-left at -1', () => {
    expect(biasToBucket(-1)).toBe('far-left')
  })
  it('uses far-left at the inclusive boundary -0.6', () => {
    expect(biasToBucket(-0.6)).toBe('far-left')
  })
  it('classifies left at -0.4', () => {
    expect(biasToBucket(-0.4)).toBe('left')
  })
  it('classifies center at 0', () => {
    expect(biasToBucket(0)).toBe('center')
  })
  it('classifies right at 0.4', () => {
    expect(biasToBucket(0.4)).toBe('right')
  })
  it('classifies far-right at 1', () => {
    expect(biasToBucket(1)).toBe('far-right')
  })
  it('clamps out-of-range values into the end buckets', () => {
    expect(biasToBucket(-5)).toBe('far-left')
    expect(biasToBucket(5)).toBe('far-right')
  })
})

describe('reliabilityToTier', () => {
  it('classifies high at 0.9', () => {
    expect(reliabilityToTier(0.9)).toBe('high')
  })
  it('classifies medium at 0.5', () => {
    expect(reliabilityToTier(0.5)).toBe('medium')
  })
  it('classifies low at 0.3', () => {
    expect(reliabilityToTier(0.3)).toBe('low')
  })
  it('classifies disputed at 0.1', () => {
    expect(reliabilityToTier(0.1)).toBe('disputed')
  })
})

describe('biasToPercent', () => {
  it('maps -1 to 0%', () => {
    expect(biasToPercent(-1)).toBe(0)
  })
  it('maps 0 to 50%', () => {
    expect(biasToPercent(0)).toBe(50)
  })
  it('maps 1 to 100%', () => {
    expect(biasToPercent(1)).toBe(100)
  })
})

describe('bucketColor / tierColor', () => {
  it('returns CSS var strings for every bucket', () => {
    expect(bucketColor('far-left')).toMatch(/^var\(/)
    expect(bucketColor('left')).toMatch(/^var\(/)
    expect(bucketColor('center')).toMatch(/^var\(/)
    expect(bucketColor('right')).toMatch(/^var\(/)
    expect(bucketColor('far-right')).toMatch(/^var\(/)
  })
  it('returns CSS var strings for every reliability tier', () => {
    expect(tierColor('high')).toMatch(/^var\(/)
    expect(tierColor('medium')).toMatch(/^var\(/)
    expect(tierColor('low')).toMatch(/^var\(/)
    expect(tierColor('disputed')).toMatch(/^var\(/)
  })
})

describe('<BiasIndicator>', () => {
  it('renders the scale + marker by default', async () => {
    const { host } = await mountIndicator({ bias: -0.4 })
    expect(host.querySelector('[data-mol-id="bias-indicator-scale"]')).not.toBeNull()
    expect(host.querySelector('[data-mol-id="bias-indicator-marker"]')).not.toBeNull()
  })

  it('positions the marker at biasToPercent(bias)%', async () => {
    const { host } = await mountIndicator({ bias: 0.5 })
    const marker = host.querySelector('[data-mol-id="bias-indicator-marker"]') as HTMLElement
    expect(marker.style.left).toBe('75%')
  })

  it('exposes the bias bucket as a data attribute on the root', async () => {
    const { host } = await mountIndicator({ bias: 0.7 })
    const root = host.querySelector('[data-mol-id="bias-indicator"]') as HTMLElement
    expect(root.getAttribute('data-bias-bucket')).toBe('far-right')
  })

  it('uses the English fallback "Center" for bias=0', async () => {
    const { host } = await mountIndicator({ bias: 0 })
    expect(host.querySelector('[data-mol-id="bias-indicator-bias-label"]')?.textContent).toBe(
      'Center',
    )
  })

  it('omits the reliability indicator when reliability is undefined', async () => {
    const { host } = await mountIndicator({ bias: 0 })
    expect(host.querySelector('[data-mol-id="bias-indicator-reliability"]')).toBeNull()
  })

  it('renders the reliability chip with the matching tier when provided', async () => {
    const { host } = await mountIndicator({ bias: 0, reliability: 0.85 })
    const chip = host.querySelector('[data-mol-id="bias-indicator-reliability"]') as HTMLElement
    expect(chip).not.toBeNull()
    expect(chip.getAttribute('data-reliability-tier')).toBe('high')
    expect(chip.textContent).toContain('Reliability: high')
  })

  it('renders the source label when provided', async () => {
    const { host } = await mountIndicator({ bias: 0 }, TEMPLATE_WITH_SOURCE)
    expect(host.querySelector('[data-mol-id="bias-indicator-source"]')?.textContent).toBe('Reuters')
  })

  it('compact variant renders a single dot and no scale track', async () => {
    const { host } = await mountIndicator({ bias: -0.8, compact: true })
    expect(host.querySelector('[data-mol-id="bias-indicator-scale"]')).toBeNull()
    expect(host.querySelector('[data-mol-id="bias-indicator-marker"]')).toBeNull()
    const root = host.querySelector('[data-mol-id="bias-indicator"]') as HTMLElement
    expect(root.getAttribute('role')).toBe('img')
    expect(root.getAttribute('data-bias-bucket')).toBe('far-left')
    expect(root.getAttribute('aria-label')).toBe('Far left')
  })

  it('compact aria-label combines bias + reliability when reliability is set', async () => {
    const { host } = await mountIndicator({ bias: 0.4, reliability: 0.4, compact: true })
    const root = host.querySelector('[data-mol-id="bias-indicator"]') as HTMLElement
    expect(root.getAttribute('aria-label')).toBe('Right-leaning — Reliability: low')
  })

  it('honors a custom dataMolId override', async () => {
    const { host } = await mountIndicator({ bias: 0, dataMolId: 'article-42-bias' })
    expect(host.querySelector('[data-mol-id="article-42-bias"]')).not.toBeNull()
  })

  it('keeps a consumer list in order when an item is inserted in the middle of sourceLabel', async () => {
    const { host, setProps } = await mountIndicator(
      { bias: 0, xs: ['a', 'c'] },
      `<mol-bias-indicator [bias]="p['bias']"><ng-container ngProjectAs="[slot=sourceLabel]">@for (x of p['xs']; track x) {<b>{{ x }}</b>}</ng-container></mol-bias-indicator>`,
    )
    const labels = (): (string | null)[] =>
      Array.from(host.querySelectorAll('[data-mol-id="bias-indicator-source"] b')).map(
        (el) => el.textContent,
      )
    expect(labels()).toEqual(['a', 'c'])
    await setProps({ xs: ['a', 'b', 'c'] })
    expect(labels()).toEqual(['a', 'b', 'c'])
    await setProps({ xs: ['a', 'c'] })
    expect(labels()).toEqual(['a', 'c'])
  })

  it('shows and removes the source wrapper in the pass where the consumer @if adds and removes its content', async () => {
    const { host, setProps } = await mountIndicator(
      { bias: 0, on: false },
      `<mol-bias-indicator [bias]="p['bias']">@if (p['on']) {<span slot="sourceLabel" data-source>Reuters</span>}</mol-bias-indicator>`,
    )
    const caption = (): HTMLElement | null =>
      host.querySelector<HTMLElement>('[data-mol-id="bias-indicator-source"]')
    // React: the caption renders only when `sourceLabel !== undefined`.
    expect(caption()).toBeNull()
    await setProps({ on: true })
    expect(caption()!.querySelector('[data-source]')).not.toBeNull()
    expect(caption()!.textContent).toBe('Reuters')
    await setProps({ on: false })
    expect(caption()).toBeNull()
  })

  it("renders React's elements with no host or capture element of its own", async () => {
    const { host, setProps } = await mountIndicator(
      { bias: 0, compact: false },
      `<i>a</i><mol-bias-indicator [bias]="p['bias']" [compact]="p['compact']"></mol-bias-indicator><i>b</i>`,
    )
    const children = (): string[] =>
      Array.from(host.children).map((child) => child.tagName.toLowerCase())
    // The non-compact React root is a <div> standing in the (removed) host's place.
    expect(children()).toEqual(['i', 'div', 'i'])
    await setProps({ compact: true })
    // The compact React root is a <span> standing in the host's place.
    expect(children()).toEqual(['i', 'span', 'i'])
  })
})
