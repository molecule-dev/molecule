/**
 * The AWS SDK v3 builds its own agent and reads no proxy variable, so on a host
 * whose only egress path is an HTTP proxy every send failed with a bare
 * connection error. These assert the two halves of the fix: the agent IS handed
 * to the client's own `requestHandler` hook when the proxy env is present, and
 * NOTHING is handed to it when it is absent — a standalone app must be
 * unaffected.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const sesConstructor = vi.fn()

vi.mock('@aws-sdk/client-sesv2', () => ({
  SESv2Client: vi.fn(function (this: unknown, config: unknown) {
    sesConstructor(config)
    return {}
  }),
  SendEmailCommand: vi.fn(),
}))
vi.mock('@aws-sdk/credential-provider-node', () => ({ defaultProvider: vi.fn() }))
vi.mock('nodemailer', () => ({ default: { createTransport: vi.fn(() => ({})) } }))

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
  const { getSesClient } = await import('../provider.js')
  const { resetProxyAgents } = await import('@molecule/api-proxy-agent')
  resetProxyAgents()
  getSesClient()
  return (sesConstructor.mock.calls.at(-1)?.[0] ?? {}) as Record<string, unknown>
}

describe('SES provider — outbound proxy', () => {
  let saved: Record<string, string | undefined>

  beforeEach(() => {
    saved = Object.fromEntries(
      [...PROXY_VARS, 'AWS_SES_REGION', 'AWS_SES_ENDPOINT'].map((k) => [k, process.env[k]]),
    )
    for (const k of [...PROXY_VARS, 'AWS_SES_REGION', 'AWS_SES_ENDPOINT']) delete process.env[k]
    sesConstructor.mockClear()
  })

  afterEach(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k]
      else process.env[k] = v
    }
  })

  it('passes NO requestHandler when the proxy env is absent', async () => {
    const config = await buildClient()
    expect(config).not.toHaveProperty('requestHandler')
    expect(config.region).toBe('us-east-1')
  })

  it('passes an httpsAgent requestHandler when HTTPS_PROXY is set', async () => {
    process.env.HTTPS_PROXY = 'http://proxy.internal:3128'
    const config = await buildClient()
    const handler = config.requestHandler as { httpsAgent?: object }
    expect(handler.httpsAgent).toBeDefined()
    expect(handler.httpsAgent?.constructor.name).toBe('HttpsProxyAgent')
  })

  it('resolves the proxy against the configured region endpoint', async () => {
    process.env.AWS_SES_REGION = 'eu-west-1'
    process.env.HTTPS_PROXY = 'http://proxy.internal:3128'
    process.env.NO_PROXY = 'email.eu-west-1.amazonaws.com'
    const config = await buildClient()
    expect(config).not.toHaveProperty('requestHandler')
  })

  it('resolves the proxy against AWS_SES_ENDPOINT when one is set', async () => {
    process.env.AWS_SES_ENDPOINT = 'http://localstack.internal:4566'
    process.env.HTTP_PROXY = 'http://proxy.internal:3128'
    const config = await buildClient()
    const handler = config.requestHandler as { httpAgent?: object }
    expect(handler.httpAgent?.constructor.name).toBe('HttpProxyAgent')
  })

  it('honours NO_PROXY for a custom endpoint', async () => {
    process.env.AWS_SES_ENDPOINT = 'http://localstack.internal:4566'
    process.env.HTTP_PROXY = 'http://proxy.internal:3128'
    process.env.NO_PROXY = 'localstack.internal'
    const config = await buildClient()
    expect(config).not.toHaveProperty('requestHandler')
  })
})
