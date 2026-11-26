// @vitest-environment jsdom
/**
 * Unit tests for the Solid `LoyaltyTierBadge` and its progress helpers — a
 * port of
 * `@molecule/app-loyalty-tier-badge-react/src/__tests__/LoyaltyTierBadge.test.tsx`:
 * the same behavioral assertions, rendered with Solid's browser renderer and
 * asserted on the markup the component produces.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
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

const { computeProgress, LoyaltyTierBadge, nextTierOf } = await import('../index.js')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/**
 * Renders a view with Solid's browser renderer and disposes it after the test.
 *
 * @param view - The view to render.
 * @returns The container element.
 */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
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
    expect(mount(() => <LoyaltyTierBadge tier="bronze" />).textContent).toContain('Bronze')
    expect(mount(() => <LoyaltyTierBadge tier="silver" />).textContent).toContain('Silver')
    expect(mount(() => <LoyaltyTierBadge tier="gold" />).textContent).toContain('Gold')
    expect(mount(() => <LoyaltyTierBadge tier="platinum" />).textContent).toContain('Platinum')
  })

  it('exposes data-tier for downstream styling and tests', () => {
    const container = mount(() => <LoyaltyTierBadge tier="silver" />)
    expect(container.querySelector('[data-tier="silver"]')).not.toBeNull()
  })

  it('hides the progress bar when no points/threshold are supplied', () => {
    const container = mount(() => <LoyaltyTierBadge tier="silver" />)
    expect(container.querySelector('[role="progressbar"]')).toBeNull()
  })

  it('renders a progressbar with the correct aria-valuenow', () => {
    const container = mount(() => (
      <LoyaltyTierBadge tier="silver" points={300} nextTierThreshold={1000} />
    ))
    const bar = container.querySelector('[role="progressbar"]')
    expect(bar).not.toBeNull()
    expect(bar?.getAttribute('aria-valuenow')).toBe('30')
    expect(bar?.getAttribute('aria-valuemax')).toBe('100')
  })

  it('renders the "X to next tier" remaining label', () => {
    const container = mount(() => (
      <LoyaltyTierBadge tier="silver" points={300} nextTierThreshold={1000} />
    ))
    expect(container.textContent).toContain('700 to Gold')
  })

  it('honors a custom nextTierLabel', () => {
    const container = mount(() => (
      <LoyaltyTierBadge
        tier="gold"
        points={50000}
        nextTierThreshold={100000}
        nextTierLabel="Diamond"
      />
    ))
    expect(container.textContent).toContain('50000 to Diamond')
  })

  it('shows the "top tier" message at platinum with no progress', () => {
    const container = mount(() => <LoyaltyTierBadge tier="platinum" />)
    expect(container.textContent).toContain('Top tier reached')
  })

  it('does NOT render a progressbar at platinum even with points provided', () => {
    const container = mount(() => (
      <LoyaltyTierBadge tier="platinum" points={5000} nextTierThreshold={10000} />
    ))
    expect(container.querySelector('[role="progressbar"]')).toBeNull()
  })

  it('honors an explicit tierLabel override', () => {
    const container = mount(() => <LoyaltyTierBadge tier="gold" tierLabel="VIP" />)
    expect(container.textContent).toContain('VIP')
  })

  it('forwards dataMolId for agent automation', () => {
    const container = mount(() => <LoyaltyTierBadge dataMolId="account-tier" tier="gold" />)
    expect(container.querySelector('[data-mol-id="account-tier"]')).not.toBeNull()
  })

  it('exposes role="group" with a translated aria-label', () => {
    const container = mount(() => <LoyaltyTierBadge tier="gold" />)
    expect(container.querySelector('[role="group"]')?.getAttribute('aria-label')).toBe('Gold tier')
  })
})
