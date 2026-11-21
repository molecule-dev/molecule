// @vitest-environment jsdom
/**
 * The default limit rows' own text goes through i18n — a port of
 * `@molecule/app-billing-react/src/__tests__/limits-i18n.test.tsx`: the same
 * test names and assertions, rendered with Svelte 5's client mount in jsdom.
 * The page mounts with a `t` that marks every key, so a label or the
 * unlimited sentinel that bypassed `t()` would show up as plain English.
 *
 * @module
 */

import { mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

// The limits the tier carries; each test sets its own before mounting.
const state = vi.hoisted(() => ({ limits: {} as Record<string, unknown> }))

// A minimal readable store, so `$store` auto-subscription works in the page.
function store<T>(value: T): { subscribe(fn: (v: T) => void): () => void } {
  return {
    subscribe(fn: (v: T) => void) {
      fn(value)
      return () => undefined
    },
  }
}

// Class tokens echo their own name — the same mock the React tests use.
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_target, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls.filter((c) => typeof c === 'string' && c.length > 0).join(' ')
        }
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))
// The icon marker renders nothing: this test reads text, not glyphs.
vi.mock('@molecule/app-ui-svelte', () => ({
  Icon: () => ({}),
}))
// A `t` that marks every key, so a default that bypassed t() renders as
// plain English.
vi.mock('@molecule/app-svelte', () => ({
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
  useAuth: () => ({ isAuthenticated: store(true) }),
}))
// The tiers endpoint's answer, so the page renders its default limit rows.
vi.mock('../hooks.js', () => ({
  usePricingTiers: () => ({
    data: store({
      data: [
        {
          key: 'pro',
          name: 'Pro',
          prices: [{ period: 'month', price: '$19/mo', stripePriceId: 'price_pro_m' }],
          limits: state.limits,
        },
      ],
    }),
    loading: store(false),
    error: store(null),
  }),
  useStartCheckout: () => ({
    start: async () => null,
    loading: store(false),
    error: store(null),
  }),
}))

const { default: PricingPage } = await import('../PricingPage.svelte')

/** The mounts one test made, destroyed in `afterEach`. */
const apps: Array<ReturnType<typeof mount>> = []

afterEach(() => {
  for (const app of apps.splice(0)) unmount(app)
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('PricingPage default limits text', () => {
  /**
   * Mounts the page against the limits `state.limits` carries.
   *
   * @returns The tier card's text content.
   */
  async function mountPage(): Promise<string> {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const app = mount(PricingPage, { target: host, props: {} })
    apps.push(app)
    return host.querySelector('[data-mol-id="pricing-tier-pro"]')?.textContent ?? ''
  }

  it('renders the default limit labels through i18n', async () => {
    state.limits = { maxProjects: 100, canExport: true }
    const text = await mountPage()
    expect(text).toContain('«billing.pricing.limit.maxProjects»')
    expect(text).toContain('«billing.pricing.limit.canExport»')
    // The humanized English fallback must not leak: only the key renders.
    expect(text).not.toContain('Max projects')
    expect(text).not.toContain('Can export')
  })

  it('renders the unlimited sentinel through i18n', async () => {
    state.limits = { maxSeats: 1_000_000, maxProjects: 500 }
    const text = await mountPage()
    expect(text).toContain('«billing.pricing.unlimited»')
    // A number below the sentinel stays a number.
    expect(text).toContain('500')
    expect(text).not.toContain('Unlimited')
  })
})
