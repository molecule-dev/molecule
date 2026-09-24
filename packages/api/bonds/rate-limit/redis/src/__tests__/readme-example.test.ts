/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real rate-limit core.
 * Only `ioredis` is replaced — by an in-memory stand-in whose `eval()` runs the
 * bond's sliding-window script semantics over a JS sorted set.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { configure, consume, setProvider } from '@molecule/api-rate-limit'

import { createProvider } from '../index.js'

const redis = vi.hoisted(() => {
  const sets = new Map<string, Array<{ score: number; member: string }>>()
  const Redis = vi.fn(function () {
    return {
      on: vi.fn(),
      // KEYS[1], windowStart, now, max, cost, windowMs, ...members — see CONSUME_SCRIPT.
      eval: vi.fn(async (_script: string, _numKeys: number, key: string, ...argv: string[]) => {
        const [windowStart, now, max, cost, , ...members] = argv
        const kept = (sets.get(key) ?? []).filter((entry) => entry.score > Number(windowStart))
        sets.set(key, kept)
        if (kept.length + Number(cost) > Number(max)) return [0, kept.length]
        for (const member of members) kept.push({ score: Number(now), member })
        return [1, kept.length]
      }),
    }
  })
  return { Redis, sets }
})

vi.mock('ioredis', () => ({ Redis: redis.Redis, default: redis.Redis }))

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('allows max attempts in the sliding window, then rejects with retryAfter in seconds', async () => {
    vi.stubEnv('REDIS_URL', 'rediss://redis.example.com:6380')

    setProvider(createProvider({ url: process.env.REDIS_URL, failMode: 'closed' }))
    configure({ windowMs: 60_000, max: 5, keyPrefix: 'login' })

    const attemptLogin = async (
      email: string,
    ): Promise<{ status: number; retryAfter?: number; remaining?: number }> => {
      const limit = await consume(email.toLowerCase())
      if (!limit.allowed) return { status: 429, retryAfter: limit.retryAfter }
      return { status: 200, remaining: limit.remaining }
    }

    const results = []
    for (let attempt = 0; attempt < 6; attempt++)
      results.push(await attemptLogin('Ada@example.com'))

    expect(redis.Redis).toHaveBeenCalledWith('rediss://redis.example.com:6380', {
      keyPrefix: 'rl:',
    })
    expect(results[0]).toEqual({ status: 200, remaining: 4 })
    expect(results[4]).toEqual({ status: 200, remaining: 0 })
    expect(results[5]).toEqual({ status: 429, retryAfter: 60 })
    expect(redis.sets.get('login:ada@example.com')).toHaveLength(5)
  })
})
