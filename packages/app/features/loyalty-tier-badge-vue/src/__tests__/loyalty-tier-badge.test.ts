// @vitest-environment jsdom
/**
 * Unit tests for the Vue `LoyaltyTierBadge` and its progress helpers — a port
 * of `@molecule/app-loyalty-tier-badge-react/src/__tests__/LoyaltyTierBadge.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

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

import { createApp, defineComponent, h } from 'vue'

import { computeProgress, LoyaltyTierBadge, nextTierOf } from '../index.js'
import type { LoyaltyTierBadgeProps } from '../types.js'

const mounted: Array<{ unmount: () => void; host: HTMLElement }> = []

afterEach(() => {
  for (const { unmount, host } of mounted.splice(0)) {
    unmount()
    host.remove()
  }
  document.body.innerHTML = ''
})

/**
 * Renders a {@link LoyaltyTierBadge} and returns the mounted host.
 *
 * @param props - The badge props.
 * @returns The host element the badge rendered into, and its markup.
 */
const render = (props: LoyaltyTierBadgeProps): { host: HTMLElement; markup: string } => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(LoyaltyTierBadge, props) }))
  app.mount(host)
  mounted.push({ unmount: () => app.unmount(), host })
  return { host, markup: host.innerHTML }
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
    expect(render({ tier: 'bronze' }).host.textContent).toContain('Bronze')
    expect(render({ tier: 'silver' }).host.textContent).toContain('Silver')
    expect(render({ tier: 'gold' }).host.textContent).toContain('Gold')
    expect(render({ tier: 'platinum' }).host.textContent).toContain('Platinum')
  })

  it('exposes data-tier for downstream styling and tests', () => {
    const { host } = render({ tier: 'silver' })
    expect(host.querySelector('[data-tier="silver"]')).not.toBeNull()
  })

  it('hides the progress bar when no points/threshold are supplied', () => {
    const { host } = render({ tier: 'silver' })
    expect(host.querySelector('[role="progressbar"]')).toBeNull()
  })

  it('renders a progressbar with the correct aria-valuenow', () => {
    const { host } = render({ tier: 'silver', points: 300, nextTierThreshold: 1000 })
    const bar = host.querySelector('[role="progressbar"]')
    expect(bar).not.toBeNull()
    expect(bar?.getAttribute('aria-valuenow')).toBe('30')
    expect(bar?.getAttribute('aria-valuemax')).toBe('100')
  })

  it('renders the "X to next tier" remaining label', () => {
    const { host } = render({ tier: 'silver', points: 300, nextTierThreshold: 1000 })
    expect(host.textContent).toContain('700 to Gold')
  })

  it('honors a custom nextTierLabel', () => {
    const { host } = render({
      tier: 'gold',
      points: 50000,
      nextTierThreshold: 100000,
      nextTierLabel: 'Diamond',
    })
    expect(host.textContent).toContain('50000 to Diamond')
  })

  it('shows the "top tier" message at platinum with no progress', () => {
    const { host } = render({ tier: 'platinum' })
    expect(host.textContent).toContain('Top tier reached')
  })

  it('does NOT render a progressbar at platinum even with points provided', () => {
    const { host } = render({ tier: 'platinum', points: 5000, nextTierThreshold: 10000 })
    expect(host.querySelector('[role="progressbar"]')).toBeNull()
  })

  it('honors an explicit tierLabel override', () => {
    const { host } = render({ tier: 'gold', tierLabel: 'VIP' })
    expect(host.textContent).toContain('VIP')
  })

  it('forwards dataMolId for agent automation', () => {
    const { host } = render({ dataMolId: 'account-tier', tier: 'gold' })
    expect(host.querySelector('[data-mol-id="account-tier"]')).not.toBeNull()
  })

  it('exposes role="group" with a translated aria-label', () => {
    const { host } = render({ tier: 'gold' })
    const group = host.querySelector('[role="group"]')
    expect(group?.getAttribute('aria-label')).toBe('Gold tier')
  })
})
