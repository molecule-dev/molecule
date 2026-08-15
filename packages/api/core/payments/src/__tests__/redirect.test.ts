import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  DEFAULT_PLAN_UPDATED_PATH,
  resolveBillingPortalReturnUrl,
  resolveCheckoutRedirectUrls,
} from '../redirect.js'

describe('resolveCheckoutRedirectUrls', () => {
  beforeEach(() => {
    vi.stubEnv('PORT', '4000')
    vi.stubEnv('API_ORIGIN', 'https://api.example.com')
    vi.stubEnv('APP_ORIGIN', 'https://app.example.com')
    vi.stubEnv('ORIGIN', '')
    vi.stubEnv('PAYMENTS_PLAN_UPDATED_PATH', '')
    vi.stubEnv('PAYMENTS_CHECKOUT_CANCEL_PATH', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  // The whole point of the helper: cookies are host-only on the app, so a
  // provider redirect to the API host arrives with no credentials and an
  // authenticated callback there answers 401.
  it('builds both URLs from the APP origin, never the API origin', () => {
    const urls = resolveCheckoutRedirectUrls({
      provider: 'stripe',
      sessionIdToken: '{CHECKOUT_SESSION_ID}',
    })

    expect(urls.successUrl).toBe(
      'https://app.example.com/plan-updated?provider=stripe&sessionId={CHECKOUT_SESSION_ID}',
    )
    expect(urls.cancelUrl).toBe('https://app.example.com')
    expect(urls.successUrl).not.toContain('api.example.com')
    expect(urls.appOrigin).toBe('https://app.example.com')
    expect(urls.usingFallbackOrigin).toBe(false)
  })

  it('omits the session parameter for providers that append their own ids', () => {
    const urls = resolveCheckoutRedirectUrls({ provider: 'paypal' })

    expect(urls.successUrl).toBe('https://app.example.com/plan-updated?provider=paypal')
    expect(urls.successUrl).not.toContain('sessionId')
  })

  it('writes the provider placeholder verbatim so the provider can substitute it', () => {
    const urls = resolveCheckoutRedirectUrls({
      provider: 'stripe',
      sessionIdToken: '{CHECKOUT_SESSION_ID}',
    })

    expect(urls.successUrl).toContain('sessionId={CHECKOUT_SESSION_ID}')
    expect(urls.successUrl).not.toContain('%7B')
  })

  it('falls back to ORIGIN when APP_ORIGIN is unset', () => {
    vi.stubEnv('APP_ORIGIN', '')
    vi.stubEnv('ORIGIN', 'https://one.example.com')

    const urls = resolveCheckoutRedirectUrls({ provider: 'stripe' })

    expect(urls.appOrigin).toBe('https://one.example.com')
    expect(urls.usingFallbackOrigin).toBe(false)
  })

  // A deployed app with no origin configured would return the buyer to
  // localhost after they paid — the flag is what lets each bond warn about it.
  it('flags the localhost fallback when nothing is configured', () => {
    vi.stubEnv('APP_ORIGIN', '')
    vi.stubEnv('ORIGIN', '')

    const urls = resolveCheckoutRedirectUrls({ provider: 'stripe' })

    expect(urls.appOrigin).toBe('http://localhost:3000')
    expect(urls.usingFallbackOrigin).toBe(true)
  })

  it('derives the dev app port from PORT - 1000', () => {
    vi.stubEnv('APP_ORIGIN', '')
    vi.stubEnv('ORIGIN', '')
    vi.stubEnv('PORT', '4030')

    expect(resolveCheckoutRedirectUrls({ provider: 'stripe' }).appOrigin).toBe(
      'http://localhost:3030',
    )
  })

  it('lets an app point the return + cancel routes at its own paths', () => {
    vi.stubEnv('PAYMENTS_PLAN_UPDATED_PATH', 'account/upgraded')
    vi.stubEnv('PAYMENTS_CHECKOUT_CANCEL_PATH', '/pricing')

    const urls = resolveCheckoutRedirectUrls({ provider: 'stripe' })

    // A path configured without its leading slash must not concatenate into
    // `https://app.example.comaccount/upgraded`.
    expect(urls.successUrl).toBe('https://app.example.com/account/upgraded?provider=stripe')
    expect(urls.cancelUrl).toBe('https://app.example.com/pricing')
  })

  it('tolerates a trailing slash on the configured origin', () => {
    vi.stubEnv('APP_ORIGIN', 'https://app.example.com/')

    const urls = resolveCheckoutRedirectUrls({ provider: 'stripe' })

    expect(urls.successUrl).toBe(
      `https://app.example.com${DEFAULT_PLAN_UPDATED_PATH}?provider=stripe`,
    )
  })
})

describe('resolveBillingPortalReturnUrl', () => {
  beforeEach(() => {
    vi.stubEnv('PORT', '4000')
    vi.stubEnv('APP_ORIGIN', 'https://app.example.com')
    vi.stubEnv('ORIGIN', '')
    vi.stubEnv('PAYMENTS_BILLING_RETURN_PATH', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns the user to the app origin by default', () => {
    expect(resolveBillingPortalReturnUrl()).toBe('https://app.example.com')
  })

  it('honors an app-relative path so the user lands back where they were', () => {
    expect(resolveBillingPortalReturnUrl('/settings?tab=billing')).toBe(
      'https://app.example.com/settings?tab=billing',
    )
  })

  // The value comes from the client, so anything that could leave the app
  // origin would make this an open redirect off the provider's domain.
  it.each(['https://evil.example', '//evil.example', '/\\evil.example', 'billing'])(
    'refuses off-origin return path %s',
    (path) => {
      expect(resolveBillingPortalReturnUrl(path)).toBe('https://app.example.com')
    },
  )

  it('falls back to PAYMENTS_BILLING_RETURN_PATH when the caller sends none', () => {
    vi.stubEnv('PAYMENTS_BILLING_RETURN_PATH', 'billing')

    expect(resolveBillingPortalReturnUrl()).toBe('https://app.example.com/billing')
  })
})
