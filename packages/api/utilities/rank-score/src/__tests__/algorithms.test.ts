import { describe, expect, it } from 'vitest'

import type { RankItem } from '../index.js'
import {
  hnScore,
  pureScore,
  rankScore,
  recencyScore,
  redditBestScore,
  redditControversialScore,
  redditHotScore,
} from '../index.js'

const HOUR = 3_600_000
const NOW_MS = Date.parse('2026-05-01T12:00:00Z')
const NOW = new Date(NOW_MS)

const at = (offsetMs: number): Date => new Date(NOW_MS + offsetMs)

describe('hnScore', () => {
  it('decays as items age (more votes can still lose to fresh content)', () => {
    const fresh: RankItem = { ups: 5, downs: 0, createdAt: at(-1 * HOUR) }
    const old: RankItem = { ups: 50, downs: 0, createdAt: at(-48 * HOUR) }
    const a = hnScore(fresh, { now: NOW })
    const b = hnScore(old, { now: NOW })
    expect(a).toBeGreaterThan(b)
  })

  it('is monotonically decreasing in age for the same vote count', () => {
    const item = (h: number): RankItem => ({
      ups: 10,
      downs: 0,
      createdAt: at(-h * HOUR),
    })
    const ages = [0, 1, 4, 12, 24, 48, 168]
    const scores = ages.map((h) => hnScore(item(h), { now: NOW }))
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeLessThan(scores[i - 1]!)
    }
  })

  it('clamps points at 0 — heavily-downvoted items collapse to ≤ 0', () => {
    const item: RankItem = { ups: 1, downs: 100, createdAt: at(-HOUR) }
    expect(hnScore(item, { now: NOW })).toBeLessThanOrEqual(0)
  })

  it('higher gravity = faster decay', () => {
    const item: RankItem = { ups: 100, downs: 0, createdAt: at(-12 * HOUR) }
    const slow = hnScore(item, { now: NOW, gravity: 1.2 })
    const fast = hnScore(item, { now: NOW, gravity: 2.5 })
    expect(slow).toBeGreaterThan(fast)
  })

  it('accepts ISO strings, Date, and epoch ms interchangeably', () => {
    const ms = at(-2 * HOUR).getTime()
    const fromIso = hnScore(
      { ups: 10, downs: 0, createdAt: new Date(ms).toISOString() },
      { now: NOW.toISOString() },
    )
    const fromDate = hnScore({ ups: 10, downs: 0, createdAt: new Date(ms) }, { now: NOW })
    const fromMs = hnScore({ ups: 10, downs: 0, createdAt: ms }, { now: NOW_MS })
    expect(fromIso).toBeCloseTo(fromDate, 12)
    expect(fromDate).toBeCloseTo(fromMs, 12)
  })
})

describe('redditHotScore', () => {
  it('symmetric across ups/downs at zero age (newly-created items)', () => {
    // At age 0 the time term vanishes and `log10(|score|)` is the only
    // contribution — strict mirror.
    const up: RankItem = { ups: 100, downs: 0, createdAt: NOW }
    const down: RankItem = { ups: 0, downs: 100, createdAt: NOW }
    const a = redditHotScore(up, { now: NOW })
    const b = redditHotScore(down, { now: NOW })
    expect(a).toBeCloseTo(-b, 12)
    expect(Math.sign(a)).toBe(1)
    expect(Math.sign(b)).toBe(-1)
  })

  it('all items decay over time (newer always ranks above older)', () => {
    // The age term is sign-independent in our adapted form, so older items
    // — positive OR negative — always rank lower than freshly-created mirrors.
    const cases: Array<[RankItem, RankItem]> = [
      [
        { ups: 100, downs: 0, createdAt: NOW },
        { ups: 100, downs: 0, createdAt: at(-24 * HOUR) },
      ],
      [
        { ups: 0, downs: 100, createdAt: NOW },
        { ups: 0, downs: 100, createdAt: at(-24 * HOUR) },
      ],
    ]
    for (const [fresh, old] of cases) {
      expect(redditHotScore(fresh, { now: NOW })).toBeGreaterThan(redditHotScore(old, { now: NOW }))
    }
  })

  it('newer items rank higher than older items at the same vote count', () => {
    const fresh: RankItem = { ups: 50, downs: 0, createdAt: at(-1 * HOUR) }
    const old: RankItem = { ups: 50, downs: 0, createdAt: at(-24 * HOUR) }
    expect(redditHotScore(fresh, { now: NOW })).toBeGreaterThan(redditHotScore(old, { now: NOW }))
  })

  it('zero-net-score items use log10(1) = 0 as the order term', () => {
    const tied: RankItem = { ups: 5, downs: 5, createdAt: NOW }
    expect(redditHotScore(tied, { now: NOW })).toBe(0)
  })
})

describe('redditBestScore', () => {
  it('returns 0 when there are no votes', () => {
    expect(redditBestScore({ ups: 0, downs: 0, createdAt: NOW })).toBe(0)
  })

  it('all-upvote items grow with sample size (more confidence)', () => {
    const small = redditBestScore({ ups: 10, downs: 0, createdAt: NOW })
    const big = redditBestScore({ ups: 1000, downs: 0, createdAt: NOW })
    expect(big).toBeGreaterThan(small)
    expect(big).toBeLessThan(1)
  })

  it('tied votes (50/50) score below all-upvote items', () => {
    const tied = redditBestScore({ ups: 50, downs: 50, createdAt: NOW })
    const allUp = redditBestScore({ ups: 50, downs: 0, createdAt: NOW })
    expect(tied).toBeLessThan(allUp)
    expect(tied).toBeGreaterThan(0)
    expect(tied).toBeLessThan(0.5)
  })

  it('result is always within [0, 1)', () => {
    for (const item of [
      { ups: 1, downs: 0 },
      { ups: 1, downs: 1 },
      { ups: 1000, downs: 1 },
      { ups: 0, downs: 1000 },
      { ups: 7, downs: 3 },
    ] as const) {
      const s = redditBestScore({ ...item, createdAt: NOW })
      expect(s).toBeGreaterThanOrEqual(0)
      expect(s).toBeLessThan(1)
    }
  })
})

describe('redditControversialScore', () => {
  it('peaks at perfect balance for a fixed total vote count', () => {
    const total = 100
    const balanced = redditControversialScore({
      ups: 50,
      downs: 50,
      createdAt: NOW,
    })
    const lopsided = redditControversialScore({
      ups: 90,
      downs: 10,
      createdAt: NOW,
    })
    expect(balanced).toBeGreaterThan(lopsided)
    expect(balanced).toBe(total) // 100 * (50/50) = 100
  })

  it('returns 0 when either side has zero votes', () => {
    expect(redditControversialScore({ ups: 100, downs: 0, createdAt: NOW })).toBe(0)
    expect(redditControversialScore({ ups: 0, downs: 100, createdAt: NOW })).toBe(0)
    expect(redditControversialScore({ ups: 0, downs: 0, createdAt: NOW })).toBe(0)
  })

  it('grows with engagement at fixed ratio', () => {
    const a = redditControversialScore({ ups: 5, downs: 5, createdAt: NOW })
    const b = redditControversialScore({
      ups: 50,
      downs: 50,
      createdAt: NOW,
    })
    expect(b).toBeGreaterThan(a)
  })
})

describe('recencyScore', () => {
  it('strictly decreasing in age', () => {
    const make = (h: number): RankItem => ({
      ups: 0,
      downs: 0,
      createdAt: at(-h * HOUR),
    })
    const young = recencyScore(make(0), { now: NOW })
    const mid = recencyScore(make(6), { now: NOW })
    const old = recencyScore(make(48), { now: NOW })
    expect(young).toBeGreaterThan(mid)
    expect(mid).toBeGreaterThan(old)
    expect(young).toBeLessThanOrEqual(1)
    expect(old).toBeGreaterThan(0)
  })

  it('gravity controls steepness', () => {
    const item: RankItem = { ups: 0, downs: 0, createdAt: at(-12 * HOUR) }
    const slow = recencyScore(item, { now: NOW, gravity: 1.2 })
    const fast = recencyScore(item, { now: NOW, gravity: 2.5 })
    expect(slow).toBeGreaterThan(fast)
  })
})

describe('pureScore', () => {
  it('returns ups - downs unconditionally', () => {
    expect(pureScore({ ups: 7, downs: 3, createdAt: NOW })).toBe(4)
    expect(pureScore({ ups: 0, downs: 5, createdAt: NOW })).toBe(-5)
    expect(pureScore({ ups: 0, downs: 0, createdAt: NOW })).toBe(0)
  })
})

describe('rankScore dispatcher', () => {
  const item: RankItem = { ups: 10, downs: 2, createdAt: at(-2 * HOUR) }
  const ctx = { now: NOW }

  it('routes to the correct algorithm', () => {
    expect(rankScore('hn', item, ctx)).toBeCloseTo(hnScore(item, ctx), 12)
    expect(rankScore('reddit-hot', item, ctx)).toBeCloseTo(redditHotScore(item, ctx), 12)
    expect(rankScore('reddit-best', item, ctx)).toBeCloseTo(redditBestScore(item), 12)
    expect(rankScore('reddit-controversial', item, ctx)).toBeCloseTo(
      redditControversialScore(item),
      12,
    )
    expect(rankScore('recency', item, ctx)).toBeCloseTo(recencyScore(item, ctx), 12)
    expect(rankScore('score', item, ctx)).toBe(pureScore(item))
  })

  it('throws on unknown algorithm', () => {
    expect(() => rankScore('nope' as never, item, ctx)).toThrow(/unknown algorithm/)
  })
})

describe('input parsing', () => {
  it('throws on invalid timestamps', () => {
    expect(() => hnScore({ ups: 1, downs: 0, createdAt: 'not-a-date' }, { now: NOW })).toThrow(
      /invalid timestamp/,
    )
  })
})
