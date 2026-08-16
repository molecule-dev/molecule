/**
 * The AWS SDK v3 builds its own agent and reads no proxy variable, so on a host
 * whose only egress path is an HTTP proxy every upload failed with a bare
 * connection error. These assert the two halves of the fix: the agent IS handed
 * to the client's own `requestHandler` hook when the proxy env is present, and
 * NOTHING is handed to it when it is absent — a standalone app must be
 * unaffected. The `NO_PROXY` cases matter most here: an S3-compatible endpoint
 * is often an internal host that must keep connecting directly.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const s3Constructor = vi.fn()

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(function (this: unknown, config: unknown) {
    s3Constructor(config)
    return {}
  }),
  DeleteObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
}))
vi.mock('@aws-sdk/lib-storage', () => ({ Upload: vi.fn() }))

const ENV_VARS = [
  'HTTP_PROXY',
  'http_proxy',
  'HTTPS_PROXY',
  'https_proxy',
  'NO_PROXY',
  'no_proxy',
  'AWS_S3_ENDPOINT',
  'AWS_ENDPOINT_URL_S3',
  'AWS_S3_REGION',
  'AWS_REGION',
]

/** Constructs the client from a freshly-imported module (it memoizes the client). */
const buildClient = async (): Promise<Record<string, unknown>> => {
  vi.resetModules()
  const { s3Client } = await import('../provider.js')
  const { resetProxyAgents } = await import('@molecule/api-proxy-agent')
  resetProxyAgents()
  // The exported client is a lazy Proxy — touching a property builds the real one.
  void (s3Client as unknown as Record<string, unknown>).config
  return (s3Constructor.mock.calls.at(-1)?.[0] ?? {}) as Record<string, unknown>
}

describe('S3 provider — outbound proxy', () => {
  let saved: Record<string, string | undefined>

  beforeEach(() => {
    saved = Object.fromEntries(ENV_VARS.map((k) => [k, process.env[k]]))
    for (const k of ENV_VARS) delete process.env[k]
    s3Constructor.mockClear()
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

  it('resolves the proxy against AWS_S3_ENDPOINT, not the AWS regional host', async () => {
    process.env.AWS_S3_ENDPOINT = 'http://minio.internal:9000'
    process.env.HTTP_PROXY = 'http://proxy.internal:3128'
    const config = await buildClient()
    const handler = config.requestHandler as { httpAgent?: object }
    expect(handler.httpAgent?.constructor.name).toBe('HttpProxyAgent')
  })

  it('leaves an internal S3-compatible endpoint listed in NO_PROXY unproxied', async () => {
    process.env.AWS_ENDPOINT_URL_S3 = 'http://minio.internal:9000'
    process.env.HTTP_PROXY = 'http://proxy.internal:3128'
    process.env.NO_PROXY = 'minio.internal'
    const config = await buildClient()
    expect(config).not.toHaveProperty('requestHandler')
  })
})
