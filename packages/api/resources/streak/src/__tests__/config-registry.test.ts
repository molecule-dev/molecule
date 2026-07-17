/**
 * config-registry tests — the server-side resolver that severs client
 * authority over streak config.
 */

vi.mock('@molecule/api-logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}))

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clearStreakConfigResolver,
  getStreakConfigResolver,
  resolveStreakConfig,
  setStreakConfigResolver,
} from '../config-registry.js'

beforeEach(() => {
  clearStreakConfigResolver()
})

afterEach(() => {
  clearStreakConfigResolver()
})

describe('resolveStreakConfig — defaults (no resolver)', () => {
  it('returns only the route activity_kind, no client-tunable levers', async () => {
    const config = await resolveStreakConfig({ activityKind: 'lesson', userId: 'user-1' })
    expect(config).toEqual({ activity_kind: 'lesson' })
    // Undefined levers → engine defaults (24h window, freezes OFF).
    expect(config.reset_after_hours).toBeUndefined()
    expect(config.freezes_per_period).toBeUndefined()
  })
})

describe('setStreakConfigResolver / getStreakConfigResolver', () => {
  it('registers and returns the resolver', () => {
    expect(getStreakConfigResolver()).toBeUndefined()
    const resolver = () => ({ freezes_per_period: 2 })
    setStreakConfigResolver(resolver)
    expect(getStreakConfigResolver()).toBe(resolver)
  })

  it('applies the resolved levers', async () => {
    setStreakConfigResolver(() => ({ reset_after_hours: 12, freezes_per_period: 3 }))
    const config = await resolveStreakConfig({ activityKind: 'workout', userId: 'user-1' })
    expect(config).toEqual({
      activity_kind: 'workout',
      reset_after_hours: 12,
      freezes_per_period: 3,
    })
  })

  it('receives the activity kind + user id as context (can be plan-derived)', async () => {
    const seen: unknown[] = []
    setStreakConfigResolver((ctx) => {
      seen.push(ctx)
      return { freezes_per_period: ctx.userId === 'pro-user' ? 5 : 0 }
    })
    const free = await resolveStreakConfig({ activityKind: 'lesson', userId: 'free-user' })
    const pro = await resolveStreakConfig({ activityKind: 'lesson', userId: 'pro-user' })
    expect(free.freezes_per_period).toBe(0)
    expect(pro.freezes_per_period).toBe(5)
    expect(seen).toEqual([
      { activityKind: 'lesson', userId: 'free-user' },
      { activityKind: 'lesson', userId: 'pro-user' },
    ])
  })

  it('always takes activity_kind from the route context, never the resolver', async () => {
    // Even if a resolver tries to smuggle a different activity_kind, the route wins.
    setStreakConfigResolver(() => ({ activity_kind: 'other', freezes_per_period: 1 }) as never)
    const config = await resolveStreakConfig({ activityKind: 'lesson', userId: 'user-1' })
    expect(config.activity_kind).toBe('lesson')
  })
})

describe('resolveStreakConfig — fail-safe', () => {
  it('falls back to defaults when the resolver throws', async () => {
    setStreakConfigResolver(() => {
      throw new Error('plan lookup failed')
    })
    const config = await resolveStreakConfig({ activityKind: 'lesson', userId: 'user-1' })
    expect(config).toEqual({ activity_kind: 'lesson' })
  })
})

describe('clearStreakConfigResolver', () => {
  it('reports whether a resolver existed and removes it', () => {
    expect(clearStreakConfigResolver()).toBe(false)
    setStreakConfigResolver(() => ({}))
    expect(clearStreakConfigResolver()).toBe(true)
    expect(getStreakConfigResolver()).toBeUndefined()
  })
})
