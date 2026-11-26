// @vitest-environment jsdom
/**
 * The default limit rows' own text goes through i18n — the render-level
 * companion of the label-helper tests in `labels.test.ts`: the page mounts
 * with a `t` that marks every key, so a label or the unlimited sentinel that
 * bypassed `t()` would show up as plain English (the gap the conformance
 * kit's pseudo-locale check found in the first tier's rows).
 *
 * @module
 */

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

// The limits the tier carries; each test sets its own before mounting.
const state = vi.hoisted(() => ({ limits: {} as Record<string, unknown> }))

// Class tokens echo their own name; Icon records its glyph.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () =>
    new Proxy(
      {},
      {
        get: (_target, prop) =>
          prop === 'cn'
            ? (...cls: unknown[]) => cls.filter((c) => typeof c === 'string' && c).join(' ')
            : () => String(prop),
      },
    ),
}))
vi.mock('@molecule/app-ui-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  Icon: ({ name }: { name: string }) => createElement('i', { 'data-icon': name }),
}))
// A `t` that marks every key, so a default that bypassed t() renders as
// plain English.
vi.mock('@molecule/app-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
  useAuth: () => ({ isAuthenticated: true }),
}))
// The tiers endpoint's answer, so the page renders its default limit rows.
vi.mock('../hooks.js', () => ({
  usePricingTiers: () => ({
    data: {
      data: [
        {
          key: 'pro',
          name: 'Pro',
          prices: [{ period: 'month', price: '$19/mo', stripePriceId: 'price_pro_m' }],
          limits: state.limits,
        },
      ],
    },
    loading: false,
    error: null,
  }),
  useStartCheckout: () => ({ start: async () => null, loading: false, error: null }),
}))

const { PricingPage } = await import('../PricingPage.js')

let root: Root | null = null
let host: HTMLElement | null = null

afterEach(async () => {
  if (root) await act(async () => root?.unmount())
  host?.remove()
  root = null
  host = null
})

/**
 * Mounts the page against the limits `state.limits` carries.
 *
 * @returns The tier card's text content.
 */
async function mountPage(): Promise<string> {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root?.render(createElement(PricingPage, {}))
  })
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
