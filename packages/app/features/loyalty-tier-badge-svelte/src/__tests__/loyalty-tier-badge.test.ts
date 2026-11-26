// @vitest-environment jsdom
/**
 * Unit tests for `LoyaltyTierBadge` — the port of
 * `@molecule/app-loyalty-tier-badge-react`'s own suite: the same test names and
 * the same behavioral assertions, rendered with a real Svelte mount (jsdom) and
 * the mocked ClassMap the React suite uses.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `flex`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
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

import LoyaltyTierBadge from '../LoyaltyTierBadge.svelte'
import { computeProgress, nextTierOf } from '../utils.js'

const instances: unknown[] = []

afterEach(async () => {
  for (const instance of instances.splice(0))
    await unmount(instance as Parameters<typeof unmount>[0])
  document.body.innerHTML = ''
})

/**
 * Mounts a {@link LoyaltyTierBadge} and returns the target element it rendered
 * into.
 *
 * @param props - The badge props.
 * @returns The mount target.
 */
function render(props: Record<string, unknown>): HTMLElement {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const instance = mount(LoyaltyTierBadge, { target, props: props as never })
  instances.push(instance)
  flushSync()
  return target
}

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
  it('renders the tier label by default ("Bronze", "Silver", …)', () => {
    expect(render({ tier: 'bronze' }).textContent).toContain('Bronze')
    expect(render({ tier: 'silver' }).textContent).toContain('Silver')
    expect(render({ tier: 'gold' }).textContent).toContain('Gold')
    expect(render({ tier: 'platinum' }).textContent).toContain('Platinum')
  })

  it('exposes data-tier for downstream styling and tests', () => {
    const target = render({ tier: 'silver' })
    expect(target.querySelector('[data-tier="silver"]')).not.toBeNull()
  })

  it('hides the progress bar when no points/threshold are supplied', () => {
    const target = render({ tier: 'silver' })
    expect(target.querySelector('[role="progressbar"]')).toBeNull()
  })

  it('renders a progressbar with the correct aria-valuenow', () => {
    const target = render({ tier: 'silver', points: 300, nextTierThreshold: 1000 })
    const bar = target.querySelector('[role="progressbar"]')
    expect(bar).not.toBeNull()
    expect(bar?.getAttribute('aria-valuenow')).toBe('30')
    expect(bar?.getAttribute('aria-valuemax')).toBe('100')
  })

  it('renders the "X to next tier" remaining label', () => {
    const target = render({ tier: 'silver', points: 300, nextTierThreshold: 1000 })
    expect(target.textContent).toContain('700 to Gold')
  })

  it('honors a custom nextTierLabel', () => {
    const target = render({
      tier: 'gold',
      points: 50000,
      nextTierThreshold: 100000,
      nextTierLabel: 'Diamond',
    })
    expect(target.textContent).toContain('50000 to Diamond')
  })

  it('shows the "top tier" message at platinum with no progress', () => {
    const target = render({ tier: 'platinum' })
    expect(target.textContent).toContain('Top tier reached')
  })

  it('does NOT render a progressbar at platinum even with points provided', () => {
    const target = render({ tier: 'platinum', points: 5000, nextTierThreshold: 10000 })
    expect(target.querySelector('[role="progressbar"]')).toBeNull()
  })

  it('honors an explicit tierLabel override', () => {
    const target = render({ tier: 'gold', tierLabel: 'VIP' })
    expect(target.textContent).toContain('VIP')
  })

  it('forwards dataMolId for agent automation', () => {
    const target = render({ dataMolId: 'account-tier', tier: 'gold' })
    expect(target.querySelector('[data-mol-id="account-tier"]')).not.toBeNull()
  })

  it('exposes role="group" with a translated aria-label', () => {
    const target = render({ tier: 'gold' })
    expect(target.querySelector('[role="group"]')?.getAttribute('aria-label')).toBe('Gold tier')
  })
})
