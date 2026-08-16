/**
 * The AWS SDK v3 builds its own agent and reads no proxy variable, so on a host
 * whose only egress path is an HTTP proxy every template read/write failed with
 * a bare connection error. These assert the two halves of the fix: the agent IS
 * handed to the client's own `requestHandler` hook when the proxy env is
 * present, and NOTHING is handed to it when it is absent.
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
  DeleteObjectsCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
  HeadObjectCommand: vi.fn(),
  ListObjectsV2Command: vi.fn(),
  PutObjectCommand: vi.fn(),
}))
vi.mock('@aws-sdk/s3-request-presigner', () => ({ getSignedUrl: vi.fn() }))

const PROXY_VARS = [
  'HTTP_PROXY',
  'http_proxy',
  'HTTPS_PROXY',
  'https_proxy',
  'NO_PROXY',
  'no_proxy',
]

const CONFIG = {
  templateBucket: 'molecule-templates',
  templateRegion: 'auto',
  templateAccessKeyId: 'probe',
  templateSecretAccessKey: 'probe',
}

/** Builds the template store from a freshly-imported module. */
const buildStore = async (
  extra: Record<string, unknown> = {},
): Promise<Record<string, unknown>> => {
  vi.resetModules()
  const { createTemplateStore } = await import('../storage.js')
  const { resetProxyAgents } = await import('@molecule/api-proxy-agent')
  resetProxyAgents()
  createTemplateStore({ ...CONFIG, ...extra } as Parameters<typeof createTemplateStore>[0])
  return (s3Constructor.mock.calls.at(-1)?.[0] ?? {}) as Record<string, unknown>
}

describe('Fly template store — outbound proxy', () => {
  let saved: Record<string, string | undefined>

  beforeEach(() => {
    saved = Object.fromEntries(PROXY_VARS.map((k) => [k, process.env[k]]))
    for (const k of PROXY_VARS) delete process.env[k]
    s3Constructor.mockClear()
  })

  afterEach(() => {
    for (const k of PROXY_VARS) {
      if (saved[k] === undefined) delete process.env[k]
      else process.env[k] = saved[k]
    }
  })

  it('passes NO requestHandler when the proxy env is absent', async () => {
    const config = await buildStore()
    expect(config).not.toHaveProperty('requestHandler')
  })

  it('passes an httpsAgent requestHandler when HTTPS_PROXY is set', async () => {
    process.env.HTTPS_PROXY = 'http://proxy.internal:3128'
    const config = await buildStore()
    const handler = config.requestHandler as { httpsAgent?: object }
    expect(handler.httpsAgent?.constructor.name).toBe('HttpsProxyAgent')
  })

  it('resolves the proxy against the configured endpoint and honours NO_PROXY', async () => {
    process.env.HTTPS_PROXY = 'http://proxy.internal:3128'
    process.env.NO_PROXY = 't3.storage.dev'
    const config = await buildStore({ templateEndpoint: 'https://t3.storage.dev' })
    expect(config).not.toHaveProperty('requestHandler')
  })
})
