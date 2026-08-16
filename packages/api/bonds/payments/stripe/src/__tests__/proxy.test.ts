/**
 * The Stripe SDK builds its own agent and reads no proxy variable, so on a host
 * whose only egress path is an HTTP proxy every call failed with a bare
 * connection error. These assert the two halves of the fix: the agent IS handed
 * to the SDK's own `httpAgent` hook when the proxy env is present, and NOTHING
 * is handed to it when it is absent — a standalone app must be unaffected.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const stripeConstructor = vi.fn()

vi.mock('stripe', () => {
  const MockStripe = vi.fn(function (this: unknown, key: string, config: unknown) {
    stripeConstructor(key, config)
    return {}
  })
  return { default: MockStripe }
})

const PROXY_VARS = [
  'HTTP_PROXY',
  'http_proxy',
  'HTTPS_PROXY',
  'https_proxy',
  'NO_PROXY',
  'no_proxy',
]

/** Constructs the client from a freshly-imported module (it memoizes the client). */
const buildClient = async (): Promise<Record<string, unknown>> => {
  vi.resetModules()
  const { getClient } = await import('../provider.js')
  const { resetProxyAgents } = await import('@molecule/api-proxy-agent')
  resetProxyAgents()
  getClient()
  return (stripeConstructor.mock.calls.at(-1)?.[1] ?? {}) as Record<string, unknown>
}

describe('stripe provider — outbound proxy', () => {
  let saved: Record<string, string | undefined>

  beforeEach(() => {
    saved = Object.fromEntries(PROXY_VARS.map((k) => [k, process.env[k]]))
    for (const k of PROXY_VARS) delete process.env[k]
    process.env.STRIPE_SECRET_KEY = 'sk_test_proxy'
    stripeConstructor.mockClear()
  })

  afterEach(() => {
    for (const k of PROXY_VARS) {
      if (saved[k] === undefined) delete process.env[k]
      else process.env[k] = saved[k]
    }
  })

  it('passes NO httpAgent when the proxy env is absent', async () => {
    const config = await buildClient()
    expect(config).not.toHaveProperty('httpAgent')
    expect(config.timeout).toBe(15_000)
    expect(config.maxNetworkRetries).toBe(2)
  })

  it('passes a CONNECT-capable httpAgent when HTTPS_PROXY is set', async () => {
    process.env.HTTPS_PROXY = 'http://proxy.internal:3128'
    const config = await buildClient()
    expect(config.httpAgent).toBeDefined()
    expect((config.httpAgent as object).constructor.name).toBe('HttpsProxyAgent')
  })

  it('passes NO httpAgent when NO_PROXY exempts api.stripe.com', async () => {
    process.env.HTTPS_PROXY = 'http://proxy.internal:3128'
    process.env.NO_PROXY = 'api.stripe.com'
    const config = await buildClient()
    expect(config).not.toHaveProperty('httpAgent')
  })
})
