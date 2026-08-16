/**
 * The AWS SDK v3 builds its own agent and reads no proxy variable, so on a host
 * whose only egress path is an HTTP proxy every queue operation failed with a
 * bare connection error. These assert the two halves of the fix: the agent IS
 * handed to the client's own `requestHandler` hook when the proxy env is
 * present, and NOTHING is handed to it when it is absent — a standalone app must
 * be unaffected.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const sqsConstructor = vi.fn()

vi.mock('@aws-sdk/client-sqs', () => ({
  SQSClient: vi.fn(function (this: unknown, config: unknown) {
    sqsConstructor(config)
    return { send: vi.fn() }
  }),
  CreateQueueCommand: vi.fn(),
  DeleteQueueCommand: vi.fn(),
  GetQueueAttributesCommand: vi.fn(),
  GetQueueUrlCommand: vi.fn(),
  ListQueuesCommand: vi.fn(),
}))

const ENV_VARS = [
  'HTTP_PROXY',
  'http_proxy',
  'HTTPS_PROXY',
  'https_proxy',
  'NO_PROXY',
  'no_proxy',
  'SQS_ENDPOINT',
  'AWS_REGION',
]

/** Builds a provider from a freshly-imported module and returns the SQS client config. */
const buildClient = async (): Promise<Record<string, unknown>> => {
  vi.resetModules()
  const { createProvider } = await import('../provider.js')
  const { resetProxyAgents } = await import('@molecule/api-proxy-agent')
  resetProxyAgents()
  createProvider()
  return (sqsConstructor.mock.calls.at(-1)?.[0] ?? {}) as Record<string, unknown>
}

describe('SQS provider — outbound proxy', () => {
  let saved: Record<string, string | undefined>

  beforeEach(() => {
    saved = Object.fromEntries(ENV_VARS.map((k) => [k, process.env[k]]))
    for (const k of ENV_VARS) delete process.env[k]
    sqsConstructor.mockClear()
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
    expect(handler.httpsAgent?.constructor.name).toBe('HttpsProxyAgent')
  })

  it('leaves a LocalStack endpoint listed in NO_PROXY unproxied', async () => {
    process.env.SQS_ENDPOINT = 'http://localstack.internal:4566'
    process.env.HTTP_PROXY = 'http://proxy.internal:3128'
    process.env.NO_PROXY = 'localstack.internal'
    const config = await buildClient()
    expect(config).not.toHaveProperty('requestHandler')
  })

  it('proxies a LocalStack endpoint that NO_PROXY does not exempt', async () => {
    process.env.SQS_ENDPOINT = 'http://localstack.internal:4566'
    process.env.HTTP_PROXY = 'http://proxy.internal:3128'
    const config = await buildClient()
    const handler = config.requestHandler as { httpAgent?: object }
    expect(handler.httpAgent?.constructor.name).toBe('HttpProxyAgent')
  })
})
