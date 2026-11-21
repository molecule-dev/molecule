// @vitest-environment jsdom
/**
 * Unit tests of `LoyaltyTierBadge` — the port of
 * `@molecule/app-loyalty-tier-badge-react`'s own suite: the same test names and
 * the same behavioral assertions, mounted through Angular's real renderer (the
 * same `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) with the mocked ClassMap the React suite uses.
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

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `flex`), so tests can assert which cm.* class was applied without a real
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

const { computeProgress, LoyaltyTierBadge, nextTierOf } = await import('../index.js')

/** The host template: every prop bound as an input on the component element. */
const TEMPLATE = `<div mol-loyalty-tier-badge [tier]="p['tier']" [points]="p['points']" [nextTierThreshold]="p['nextTierThreshold']" [nextTierLabel]="p['nextTierLabel']" [tierLabel]="p['tierLabel']" [size]="p['size']" [dataMolId]="p['dataMolId']" [className]="p['className']"></div>`

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts one standalone component through a JIT host template, written
 * exactly the way an Angular app would write it.
 *
 * @param component - The component class under test.
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(
  component: Type<unknown>,
  props: Record<string, unknown> = {},
): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [component],
    changeDetection: ChangeDetectionStrategy.Default,
    template: TEMPLATE,
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
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

const mounted: Mounted[] = []

/**
 * Mounts a {@link LoyaltyTierBadge} and remembers it for teardown.
 *
 * @param props - The badge props.
 * @returns The mounted host.
 */
const render = async (props: Record<string, unknown> = {}): Promise<Mounted> => {
  const m = await mount(LoyaltyTierBadge as Type<unknown>, props)
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
})

describe('helpers', () => {
  it('returns 0 progress when no points/threshold are passed', () => {
    expect(computeProgress()).toBe(0)
    expect(computeProgress(100)).toBe(0)
    expect(computeProgress(undefined, 1000)).toBe(0)
  })

  it('clamps progress to [0, 1]', () => {
    expect(computeProgress(-5, 100)).toBe(0)
    expect(computeProgress(50, 100)).toBe(0.5)
    expect(computeProgress(150, 100)).toBe(1)
  })

  it('protects against zero / negative thresholds', () => {
    expect(computeProgress(50, 0)).toBe(0)
    expect(computeProgress(50, -5)).toBe(0)
  })

  it('walks the tier ladder correctly', () => {
    expect(nextTierOf('bronze')).toBe('silver')
    expect(nextTierOf('silver')).toBe('gold')
    expect(nextTierOf('gold')).toBe('platinum')
    expect(nextTierOf('platinum')).toBe(null)
  })
})

describe('<LoyaltyTierBadge>', () => {
  it('renders the tier label by default ("Bronze", "Silver", …)', async () => {
    expect((await render({ tier: 'bronze' })).host.textContent).toContain('Bronze')
    expect((await render({ tier: 'silver' })).host.textContent).toContain('Silver')
    expect((await render({ tier: 'gold' })).host.textContent).toContain('Gold')
    expect((await render({ tier: 'platinum' })).host.textContent).toContain('Platinum')
  })

  it('exposes data-tier for downstream styling and tests', async () => {
    const m = await render({ tier: 'silver' })
    expect(m.host.querySelector('[data-tier="silver"]')).not.toBeNull()
  })

  it('hides the progress bar when no points/threshold are supplied', async () => {
    const m = await render({ tier: 'silver' })
    expect(m.host.querySelector('[role="progressbar"]')).toBeNull()
  })

  it('renders a progressbar with the correct aria-valuenow', async () => {
    const m = await render({ tier: 'silver', points: 300, nextTierThreshold: 1000 })
    const bar = m.host.querySelector('[role="progressbar"]')
    expect(bar).not.toBeNull()
    expect(bar?.getAttribute('aria-valuenow')).toBe('30')
    expect(bar?.getAttribute('aria-valuemax')).toBe('100')
  })

  it('renders the "X to next tier" remaining label', async () => {
    const m = await render({ tier: 'silver', points: 300, nextTierThreshold: 1000 })
    expect(m.host.textContent).toContain('700 to Gold')
  })

  it('honors a custom nextTierLabel', async () => {
    const m = await render({
      tier: 'gold',
      points: 50000,
      nextTierThreshold: 100000,
      nextTierLabel: 'Diamond',
    })
    expect(m.host.textContent).toContain('50000 to Diamond')
  })

  it('shows the "top tier" message at platinum with no progress', async () => {
    const m = await render({ tier: 'platinum' })
    expect(m.host.textContent).toContain('Top tier reached')
  })

  it('does NOT render a progressbar at platinum even with points provided', async () => {
    const m = await render({ tier: 'platinum', points: 5000, nextTierThreshold: 10000 })
    expect(m.host.querySelector('[role="progressbar"]')).toBeNull()
  })

  it('honors an explicit tierLabel override', async () => {
    const m = await render({ tier: 'gold', tierLabel: 'VIP' })
    expect(m.host.textContent).toContain('VIP')
  })

  it('forwards dataMolId for agent automation', async () => {
    const m = await render({ dataMolId: 'account-tier', tier: 'gold' })
    expect(m.host.querySelector('[data-mol-id="account-tier"]')).not.toBeNull()
  })

  it('exposes role="group" with a translated aria-label', async () => {
    const m = await render({ tier: 'gold' })
    expect(m.host.querySelector('[role="group"]')?.getAttribute('aria-label')).toBe('Gold tier')
  })
})
