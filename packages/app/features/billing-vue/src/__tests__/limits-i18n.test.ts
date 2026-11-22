// @vitest-environment jsdom
/**
 * The default limit rows' own text goes through i18n — a port of
 * `@molecule/app-billing-react/src/__tests__/limits-i18n.test.tsx`: the same
 * test names and assertions, rendered with Vue in jsdom. The page mounts with
 * a `t` that marks every key, so a label or the unlimited sentinel that
 * bypassed `t()` would show up as plain English.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick, ref } from 'vue'

// The limits the tier carries; each test sets its own before mounting.
const state = vi.hoisted(() => ({ limits: {} as Record<string, unknown> }))

// A ClassMap proxy echoing each accessed member back as its token — the same
// mock the React tests use.
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

// A `t` that marks every key, so a default that bypassed t() renders as
// plain English.
vi.mock('@molecule/app-vue', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
  useAuth: () => ({ isAuthenticated: ref(true) }),
}))

// The icon marker, so the row keeps its check glyph.
vi.mock('@molecule/app-ui-vue', () => ({
  Icon: defineComponent({
    name: 'MockIcon',
    inheritAttrs: false,
    setup(_props, { attrs }) {
      return () => h('i', { 'data-icon': attrs.name })
    },
  }),
}))

// The tiers endpoint's answer, so the page renders its default limit rows.
vi.mock('../hooks.js', () => ({
  usePricingTiers: () => ({
    data: {
      value: {
        data: [
          {
            key: 'pro',
            name: 'Pro',
            prices: [{ period: 'month', price: '$19/mo', stripePriceId: 'price_pro_m' }],
            limits: state.limits,
          },
        ],
      },
    },
    loading: { value: false },
    error: { value: null },
  }),
  useStartCheckout: () => ({
    start: async () => null,
    loading: { value: false },
    error: { value: null },
  }),
}))

const { PricingPage } = await import('../PricingPage.js')

/** The apps mounted during one test, unmounted in `afterEach`. */
const mounted: Array<() => void> = []

afterEach(() => {
  for (const unmount of mounted.splice(0)) unmount()
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

/**
 * Mounts the page against the limits `state.limits` carries.
 *
 * @returns The tier card's text content.
 */
async function mountPage(): Promise<string> {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(PricingPage, {}) }))
  app.mount(host)
  mounted.push(() => {
    app.unmount()
    host.remove()
  })
  await nextTick()
  return host.querySelector('[data-mol-id="pricing-tier-pro"]')?.textContent ?? ''
}

describe('PricingPage default limits text', () => {
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
