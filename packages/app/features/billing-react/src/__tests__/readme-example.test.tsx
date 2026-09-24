// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written: real fetch HTTP client, auth client,
 * i18n provider + locale bond, icon set and Tailwind ClassMap. Only the network
 * edge (`fetch`) is stubbed — it plays the `@molecule/api-entitlements` routes.
 *
 * @module
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { JSX } from 'react'
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'

import { createJWTAuthClient } from '@molecule/app-auth'
import { createFetchClient } from '@molecule/app-http'
import { getProvider as getI18nProvider, registerLocaleModule } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { iconSet } from '@molecule/app-icons-molecule'
import * as billingLocales from '@molecule/app-locales-billing'
import { MoleculeProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { LimitsItem, LimitsList, PricingPage } from '../index.js'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

setClassMap(classMap)
setIconSet(iconSet)
registerLocaleModule(billingLocales)
const http = createFetchClient()
const authClient = createJWTAuthClient({ baseURL: '/api' })

interface TierLimits {
  maxProjects: number
  canExport: boolean
}

/**
 * The README example, verbatim.
 *
 * @returns The pricing page inside its providers.
 */
function Pricing(): JSX.Element {
  return (
    <MoleculeProvider http={http} auth={authClient} i18n={getI18nProvider()}>
      <PricingPage<TierLimits>
        period="month"
        renderLimits={(limits) => (
          <LimitsList>
            <LimitsItem>{limits.maxProjects} projects</LimitsItem>
            <LimitsItem included={limits.canExport}>Data export</LimitsItem>
          </LimitsList>
        )}
      />
    </MoleculeProvider>
  )
}

const tiers = {
  data: [
    {
      key: 'free',
      name: 'Free',
      prices: [{ period: 'month', price: '$0', stripePriceId: null }],
      limits: { maxProjects: 3, canExport: false },
    },
    {
      key: 'pro',
      name: 'Pro',
      prices: [{ period: 'month', price: '$19/mo', stripePriceId: 'price_pro_monthly' }],
      limits: { maxProjects: 50, canExport: true },
    },
  ],
}

/**
 * Builds a JSON `Response` the way the API would send it.
 *
 * @param body - JSON body.
 * @returns The response.
 */
function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('README @example', () => {
  afterEach(() => {
    cleanup()
  })
  afterAll(() => {
    vi.unstubAllGlobals()
  })

  it('renders every tier from /api/billing/tiers and posts the price id on Upgrade', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      String(url).endsWith('/api/billing/tiers') ? json(tiers) : json({ updated: false }),
    )

    render(<Pricing />)

    await waitFor(() => expect(screen.getByText('Pro')).toBeTruthy())
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('/api/billing/tiers')
    expect(screen.getByText('Free')).toBeTruthy()
    expect(screen.getByText('$19/mo')).toBeTruthy()
    expect(screen.getByText('50 projects')).toBeTruthy()
    expect(screen.getByText('3 projects')).toBeTruthy()

    // The free tier has no Stripe price → disabled "Current plan".
    const freeCta = document.querySelector('[data-mol-id="pricing-cta-free"]') as HTMLButtonElement
    expect(freeCta.disabled).toBe(true)
    // The priciest paid tier is auto-highlighted.
    expect(
      document.querySelector('[data-mol-id="pricing-tier-pro"]')?.getAttribute('data-popular'),
    ).toBe('true')

    const upgrade = screen.getByText('Upgrade to Pro')
    fireEvent.click(upgrade)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    const [checkoutUrl, init] = fetchMock.mock.calls[1] as [string, RequestInit]
    expect(String(checkoutUrl)).toBe('/api/billing/checkout')
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual({ priceId: 'price_pro_monthly' })
  })

  it('shows a visible error when the tiers endpoint fails', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 500 }))

    render(<Pricing />)

    await waitFor(() =>
      expect(screen.getByText('Could not load pricing. Try again later.')).toBeTruthy(),
    )
  })
})
