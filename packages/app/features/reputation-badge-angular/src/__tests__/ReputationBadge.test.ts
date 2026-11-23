// @vitest-environment jsdom
/**
 * Unit tests of `ReputationBadge` — the port of
 * `@molecule/app-reputation-badge-react`'s own suite. The React suite renders
 * the component with mocked UI dependencies and asserts the markup; this port
 * mounts the same mocked tree through Angular's real renderer and asserts the
 * same DOM.
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

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => buildStubClassMap(),
}))

vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>, opts?: { defaultValue?: string }) => {
      let s = opts?.defaultValue ?? key
      if (values) {
        for (const [k, v] of Object.entries(values)) {
          s = s.replaceAll(`{{${k}}}`, String(v))
        }
      }
      return s
    },
  }),
}))

vi.mock('@molecule/app-ui-angular', async () => {
  const { Component } = await import('@angular/core')
  return {
    Badge: Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'span[mol-badge]',
      standalone: true,
      inputs: ['color'],
      host: { 'data-testid': 'badge', '[attr.data-color]': 'color ?? null' },
      template: `<ng-content></ng-content>`,
    })(
      class MockBadge {
        /** The semantic color the feature asked for. */
        color?: string
      },
    ),
  }
})

const { ReputationBadge } = await import('../reputation-badge.component.js')

/**
 * Permissive ClassMap stub — `cn(...)` joins truthy strings; every other
 * accessed member returns its own key as a string token.
 *
 * @returns A stub ClassMap-like object suitable for tests.
 */
function buildStubClassMap(): Record<string, unknown> {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_t, prop): unknown {
      if (prop === 'cn') {
        return (...classes: unknown[]) =>
          classes
            .flat()
            .filter((c) => typeof c === 'string' && c.length > 0)
            .join(' ')
      }
      const token = String(prop)
      const fn = (..._args: unknown[]): string => token
      return new Proxy(fn, {
        get(_target, key) {
          if (key === Symbol.toPrimitive || key === 'toString') return () => token
          return undefined
        },
      })
    },
  }
  return new Proxy({}, handler)
}

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
 * @param template - The host template (the component element).
 * @param component - The component class under test.
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mountSpec(
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

/** The template that binds every {@link ReputationBadge} input. */
const BADGE_TEMPLATE = `<mol-reputation-badge
  [score]="p['score']"
  [level]="p['level']"
  [thresholds]="p['thresholds']"
  [variant]="p['variant']"
  [className]="p['className']"
></mol-reputation-badge>`

const mounted: Mounted[] = []

/**
 * Mount a {@link ReputationBadge} with these props.
 *
 * @param props - The component props.
 * @returns The mounted host.
 */
async function render(props: Record<string, unknown>): Promise<Mounted> {
  const m = await mountSpec(BADGE_TEMPLATE, ReputationBadge as Type<unknown>, props)
  mounted.push(m)
  return m
}

/**
 * The rendered tier chip.
 *
 * @param host - The mounted host.
 * @returns The chip element.
 */
const chip = (host: HTMLElement): Element => host.querySelector('[data-testid="badge"]')!

/**
 * The rendered score element.
 *
 * @param host - The mounted host.
 * @returns The score element, or null.
 */
const scoreEl = (host: HTMLElement): Element | null =>
  host.querySelector('[data-mol-id="reputation-badge-score"]')

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('<ReputationBadge>', () => {
  describe('compact variant (default)', () => {
    it('renders the score and a level badge with tier color', async () => {
      const { host } = await render({ score: 1500 })
      expect(host.querySelector('[data-mol-id="reputation-badge"]')).not.toBeNull()
      expect(scoreEl(host)?.textContent).toBe('1.5k')
      expect(chip(host).textContent).toBe('Trusted')
      expect(chip(host).getAttribute('data-color')).toBe('primary')
    })

    it('renders a "newcomer" chip for scores below the threshold', async () => {
      const { host } = await render({ score: 42 })
      expect(chip(host).textContent).toBe('Newcomer')
      expect(chip(host).getAttribute('data-color')).toBe('secondary')
    })

    it('renders a "legend" chip for very large scores', async () => {
      const { host } = await render({ score: 50_000 })
      expect(chip(host).textContent).toBe('Legend')
      expect(chip(host).getAttribute('data-color')).toBe('warning')
    })

    it('honors an explicit level prop over the derived one', async () => {
      const { host } = await render({ score: 5, level: 'veteran' })
      expect(chip(host).textContent).toBe('Veteran')
      expect(chip(host).getAttribute('data-color')).toBe('success')
    })

    it('renders an out-of-contract level id through the fallback key', async () => {
      const { host } = await render({ score: 5, level: 'guru' })
      expect(chip(host).textContent).toBe('guru')
    })

    it('honors custom thresholds', async () => {
      const { host } = await render({
        score: 12,
        thresholds: { contributor: 10, trusted: 20, veteran: 30, legend: 40 },
      })
      expect(chip(host).textContent).toBe('Contributor')
    })

    it('produces an aria-label that includes both score and level', async () => {
      const { host } = await render({ score: 2500 })
      expect(
        host.querySelector('[data-mol-id="reputation-badge"]')?.getAttribute('aria-label'),
      ).toBe('2.5k reputation, Veteran')
    })

    it('formats raw integers without a suffix', async () => {
      const { host } = await render({ score: 42 })
      expect(scoreEl(host)?.textContent).toBe('42')
    })

    it('formats millions with an "m" suffix', async () => {
      const { host } = await render({ score: 1_250_000 })
      expect(scoreEl(host)?.textContent).toBe('1.3m')
    })

    it('strips a trailing .0 from compact thousands', async () => {
      const { host } = await render({ score: 2000 })
      expect(scoreEl(host)?.textContent).toBe('2k')
    })

    it('handles non-finite scores by rendering "0"', async () => {
      const { host } = await render({ score: Number.NaN })
      expect(scoreEl(host)?.textContent).toBe('0')
    })
  })

  describe('full variant', () => {
    it('renders a caption above the score row', async () => {
      const { host } = await render({ score: 1500, variant: 'full' })
      const root = host.querySelector('[data-mol-id="reputation-badge"]')
      expect(root).not.toBeNull()
      expect(root?.firstElementChild?.textContent).toBe('Reputation')
    })

    it('renders the score row inside the wrapper', async () => {
      const { host } = await render({ score: 1500, variant: 'full' })
      expect(host.querySelector('[data-mol-id="reputation-badge-row"]')).not.toBeNull()
      expect(scoreEl(host)?.textContent).toBe('1.5k')
    })
  })

  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await mountSpec(
      `<i>a</i><mol-reputation-badge [score]="p['score']" [variant]="p['variant']" /><i>b</i>`,
      ReputationBadge as Type<unknown>,
      { score: 1500 },
    )
    const children = (): string[] =>
      Array.from(m.host.children).map((child) => child.tagName.toLowerCase())
    try {
      expect(children()).toEqual(['i', 'span', 'i'])
      await m.setProps({ variant: 'full' })
      expect(children()).toEqual(['i', 'div', 'i'])
      await m.setProps({ variant: 'compact' })
      expect(children()).toEqual(['i', 'span', 'i'])
    } finally {
      await m.destroy()
    }
  })
})
