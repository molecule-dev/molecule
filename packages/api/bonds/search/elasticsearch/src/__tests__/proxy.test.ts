/**
 * `@elastic/transport` builds its own `undici.Pool` bound to the node origin,
 * which bypasses the global dispatcher `NODE_USE_ENV_PROXY` installs — so on a
 * host whose only egress path is an HTTP proxy every request failed with a bare
 * connection error. These assert the two halves of the fix: the proxy URL IS
 * handed to the client's own `proxy` option when the env is present, and NOTHING
 * is handed to it when it is absent — a self-hosted cluster on the local network
 * (the common case) must be unaffected.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const clientConstructor = vi.fn()

vi.mock('@elastic/elasticsearch', () => ({
  Client: vi.fn(function (this: unknown, config: unknown) {
    clientConstructor(config)
    return {}
  }),
  errors: { ResponseError: class ResponseError extends Error {} },
}))

const ENV_VARS = [
  'HTTP_PROXY',
  'http_proxy',
  'HTTPS_PROXY',
  'https_proxy',
  'NO_PROXY',
  'no_proxy',
  'ELASTICSEARCH_URL',
  'ELASTICSEARCH_API_KEY',
]

/** Builds a provider from a freshly-imported module and returns the client config. */
const buildClient = async (): Promise<Record<string, unknown>> => {
  vi.resetModules()
  const { createProvider } = await import('../provider.js')
  const { resetProxyAgents } = await import('@molecule/api-proxy-agent')
  resetProxyAgents()
  createProvider()
  return (clientConstructor.mock.calls.at(-1)?.[0] ?? {}) as Record<string, unknown>
}

describe('Elasticsearch provider — outbound proxy', () => {
  let saved: Record<string, string | undefined>

  beforeEach(() => {
    saved = Object.fromEntries(ENV_VARS.map((k) => [k, process.env[k]]))
    for (const k of ENV_VARS) delete process.env[k]
    clientConstructor.mockClear()
  })

  afterEach(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k]
      else process.env[k] = v
    }
  })

  it('passes NO proxy when the proxy env is absent', async () => {
    const config = await buildClient()
    expect(config).not.toHaveProperty('proxy')
    expect(config.node).toBe('http://localhost:9200')
  })

  it('leaves the default localhost node unproxied even with HTTP_PROXY set', async () => {
    process.env.HTTP_PROXY = 'http://proxy.internal:3128'
    process.env.NO_PROXY = 'localhost'
    const config = await buildClient()
    expect(config).not.toHaveProperty('proxy')
  })

  it('passes the proxy URL for a remote https node', async () => {
    process.env.ELASTICSEARCH_URL = 'https://cluster.es.example.com'
    process.env.HTTPS_PROXY = 'http://proxy.internal:3128'
    const config = await buildClient()
    expect(config.proxy).toBe('http://proxy.internal:3128')
  })

  it('honours NO_PROXY for a self-hosted node', async () => {
    process.env.ELASTICSEARCH_URL = 'http://search.internal:9200'
    process.env.HTTP_PROXY = 'http://proxy.internal:3128'
    process.env.NO_PROXY = '.internal'
    const config = await buildClient()
    expect(config).not.toHaveProperty('proxy')
  })
})
