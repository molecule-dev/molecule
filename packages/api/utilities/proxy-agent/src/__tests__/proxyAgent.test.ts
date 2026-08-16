import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  getProxyAgent,
  getProxyAgents,
  getProxyUrl,
  resetProxyAgents,
  shouldProxy,
} from '../proxyAgent.js'

const PROXY_VARS = [
  'HTTP_PROXY',
  'http_proxy',
  'HTTPS_PROXY',
  'https_proxy',
  'ALL_PROXY',
  'all_proxy',
  'NO_PROXY',
  'no_proxy',
]

describe('proxyAgent', () => {
  let saved: Record<string, string | undefined>

  beforeEach(() => {
    saved = Object.fromEntries(PROXY_VARS.map((k) => [k, process.env[k]]))
    for (const k of PROXY_VARS) delete process.env[k]
    resetProxyAgents()
  })

  afterEach(() => {
    for (const k of PROXY_VARS) {
      if (saved[k] === undefined) delete process.env[k]
      else process.env[k] = saved[k]
    }
    resetProxyAgents()
  })

  describe('with no proxy environment', () => {
    it('getProxyUrl returns undefined', () => {
      expect(getProxyUrl('https://api.stripe.com')).toBeUndefined()
    })

    it('shouldProxy is false', () => {
      expect(shouldProxy('https://api.stripe.com')).toBe(false)
    })

    it('getProxyAgent returns undefined so the SDK keeps its own default agent', () => {
      expect(getProxyAgent('https://api.stripe.com')).toBeUndefined()
    })
  })

  describe('with HTTPS_PROXY set', () => {
    beforeEach(() => {
      process.env.HTTPS_PROXY = 'http://proxy.internal:3128'
    })

    it('resolves the proxy URL for an https target', () => {
      expect(getProxyUrl('https://api.stripe.com')).toBe('http://proxy.internal:3128')
    })

    it('returns an agent for an https target', () => {
      const agent = getProxyAgent('https://api.stripe.com')
      expect(agent).toBeDefined()
      expect(agent?.constructor.name).toBe('HttpsProxyAgent')
    })

    it('does NOT proxy an http target (HTTP_PROXY is unset)', () => {
      expect(getProxyAgent('http://api.stripe.com')).toBeUndefined()
    })

    it('memoizes one agent per proxy + target protocol', () => {
      const a = getProxyAgent('https://api.stripe.com')
      const b = getProxyAgent('https://sqs.us-east-1.amazonaws.com')
      expect(a).toBe(b)
    })

    it('keepAlive is on by default and keys the cache', () => {
      const keepAlive = getProxyAgent('https://api.stripe.com')
      const oneShot = getProxyAgent('https://api.stripe.com', { keepAlive: false })
      expect(oneShot).not.toBe(keepAlive)
      expect((keepAlive as { keepAlive?: boolean }).keepAlive).toBe(true)
      expect((oneShot as { keepAlive?: boolean }).keepAlive).toBe(false)
    })

    it('resetProxyAgents drops the memoized agent', () => {
      const first = getProxyAgent('https://api.stripe.com')
      resetProxyAgents()
      expect(getProxyAgent('https://api.stripe.com')).not.toBe(first)
    })
  })

  describe('with HTTP_PROXY set', () => {
    beforeEach(() => {
      process.env.HTTP_PROXY = 'http://proxy.internal:3128'
    })

    it('returns an http agent for an http target', () => {
      const agent = getProxyAgent('http://minio.internal:9000')
      expect(agent?.constructor.name).toBe('HttpProxyAgent')
    })

    it('does NOT proxy an https target (HTTPS_PROXY is unset)', () => {
      expect(getProxyAgent('https://api.stripe.com')).toBeUndefined()
    })
  })

  describe('NO_PROXY', () => {
    beforeEach(() => {
      process.env.HTTPS_PROXY = 'http://proxy.internal:3128'
    })

    it('exempts an exact host', () => {
      process.env.NO_PROXY = 'api.stripe.com'
      expect(getProxyAgent('https://api.stripe.com')).toBeUndefined()
      expect(getProxyAgent('https://sqs.us-east-1.amazonaws.com')).toBeDefined()
    })

    it('exempts a suffix wildcard', () => {
      process.env.NO_PROXY = '.amazonaws.com'
      expect(getProxyAgent('https://sqs.us-east-1.amazonaws.com')).toBeUndefined()
      expect(getProxyAgent('https://api.stripe.com')).toBeDefined()
    })

    it('exempts everything on "*"', () => {
      process.env.NO_PROXY = '*'
      expect(getProxyAgent('https://api.stripe.com')).toBeUndefined()
    })

    it('is honoured in lowercase too', () => {
      process.env.no_proxy = 'api.stripe.com'
      expect(getProxyAgent('https://api.stripe.com')).toBeUndefined()
    })
  })

  it('ALL_PROXY covers both protocols', () => {
    process.env.ALL_PROXY = 'http://proxy.internal:3128'
    expect(getProxyAgent('https://api.stripe.com')?.constructor.name).toBe('HttpsProxyAgent')
    expect(getProxyAgent('http://minio.internal:9000')?.constructor.name).toBe('HttpProxyAgent')
  })

  it('ignores a target that is not an absolute URL', () => {
    process.env.HTTPS_PROXY = 'http://proxy.internal:3128'
    expect(getProxyAgent('api.stripe.com')).toBeUndefined()
  })

  describe('getProxyAgents', () => {
    it('is undefined with no proxy environment, so nothing is spread into the SDK config', () => {
      expect(getProxyAgents('https://api.stripe.com')).toBeUndefined()
    })

    it('returns only httpsAgent for an https target', () => {
      process.env.HTTPS_PROXY = 'http://proxy.internal:3128'
      const pair = getProxyAgents('https://sesv2.us-east-1.amazonaws.com')
      expect(Object.keys(pair!)).toEqual(['httpsAgent'])
      expect(pair!.httpsAgent?.constructor.name).toBe('HttpsProxyAgent')
    })

    it('returns only httpAgent for an http target', () => {
      process.env.HTTP_PROXY = 'http://proxy.internal:3128'
      const pair = getProxyAgents('http://minio.internal:9000')
      expect(Object.keys(pair!)).toEqual(['httpAgent'])
      expect(pair!.httpAgent?.constructor.name).toBe('HttpProxyAgent')
    })

    it('honours NO_PROXY for a custom S3-compatible endpoint', () => {
      process.env.HTTP_PROXY = 'http://proxy.internal:3128'
      process.env.NO_PROXY = 'minio.internal'
      expect(getProxyAgents('http://minio.internal:9000')).toBeUndefined()
    })
  })
})
