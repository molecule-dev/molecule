import { describe, expect, it } from 'vitest'

import { computeNps, tierFor } from '../computeNps.js'

describe('computeNps()', () => {
  it('returns score 100 when all responses are promoters (9-10)', () => {
    const result = computeNps([9, 10, 10, 9, 10])
    expect(result.score).toBe(100)
    expect(result.promoters).toBe(5)
    expect(result.passives).toBe(0)
    expect(result.detractors).toBe(0)
    expect(result.total).toBe(5)
  })

  it('returns score -100 when all responses are detractors (0-6)', () => {
    const result = computeNps([0, 1, 3, 6, 4])
    expect(result.score).toBe(-100)
    expect(result.detractors).toBe(5)
    expect(result.passives).toBe(0)
    expect(result.promoters).toBe(0)
  })

  it('returns score 0 when promoters and detractors balance', () => {
    const result = computeNps([0, 10])
    expect(result.score).toBe(0)
    expect(result.detractors).toBe(1)
    expect(result.promoters).toBe(1)
  })

  it('counts passives toward total but not the score', () => {
    // 2 promoters, 2 passives, 1 detractor → total 5
    // (2 - 1) / 5 * 100 = 20
    const result = computeNps([10, 9, 8, 7, 0])
    expect(result.total).toBe(5)
    expect(result.promoters).toBe(2)
    expect(result.passives).toBe(2)
    expect(result.detractors).toBe(1)
    expect(result.score).toBe(20)
  })

  it('rounds the score to the nearest integer', () => {
    // 1 promoter, 2 detractors → (1 - 2) / 3 * 100 = -33.33 → -33
    const result = computeNps([10, 0, 0])
    expect(result.score).toBe(-33)
  })

  it('returns score 0 and total 0 for an empty input', () => {
    const result = computeNps([])
    expect(result.score).toBe(0)
    expect(result.total).toBe(0)
    expect(result.buckets.every((b) => b.count === 0)).toBe(true)
  })

  it('returns 11 buckets in score order (0..10) regardless of input order', () => {
    const result = computeNps([10, 5, 0, 7, 9])
    expect(result.buckets).toHaveLength(11)
    expect(result.buckets.map((b) => b.score)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(result.buckets[0]?.count).toBe(1) // score 0
    expect(result.buckets[5]?.count).toBe(1) // score 5
    expect(result.buckets[7]?.count).toBe(1) // score 7
    expect(result.buckets[9]?.count).toBe(1) // score 9
    expect(result.buckets[10]?.count).toBe(1) // score 10
    expect(result.buckets[1]?.count).toBe(0) // unseen score
  })

  it('drops out-of-range, NaN, infinite, and non-integer scores', () => {
    const result = computeNps([-1, 11, NaN, Infinity, -Infinity, 7.5, 10, 0])
    expect(result.total).toBe(2)
    expect(result.promoters).toBe(1)
    expect(result.detractors).toBe(1)
  })

  it('honors custom tier cutoffs', () => {
    // detractorMax=5, passiveMax=7  →  6 becomes passive (not detractor)
    const result = computeNps([6, 6, 6], 5, 7)
    expect(result.detractors).toBe(0)
    expect(result.passives).toBe(3)
    expect(result.promoters).toBe(0)
    expect(result.score).toBe(0)
    expect(result.buckets[6]?.tier).toBe('passive')
  })

  it('tags each bucket with the correct default tier', () => {
    const result = computeNps([])
    const tierByScore: Record<number, string> = {}
    for (const b of result.buckets) tierByScore[b.score] = b.tier
    expect(tierByScore[0]).toBe('detractor')
    expect(tierByScore[6]).toBe('detractor')
    expect(tierByScore[7]).toBe('passive')
    expect(tierByScore[8]).toBe('passive')
    expect(tierByScore[9]).toBe('promoter')
    expect(tierByScore[10]).toBe('promoter')
  })
})

describe('tierFor()', () => {
  it('returns detractor for scores at or below detractorMax', () => {
    expect(tierFor(0, 6, 8)).toBe('detractor')
    expect(tierFor(6, 6, 8)).toBe('detractor')
  })

  it('returns passive between detractorMax+1 and passiveMax inclusive', () => {
    expect(tierFor(7, 6, 8)).toBe('passive')
    expect(tierFor(8, 6, 8)).toBe('passive')
  })

  it('returns promoter above passiveMax', () => {
    expect(tierFor(9, 6, 8)).toBe('promoter')
    expect(tierFor(10, 6, 8)).toBe('promoter')
  })
})
