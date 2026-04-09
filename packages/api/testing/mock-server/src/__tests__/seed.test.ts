import { describe, it, expect } from 'vitest'
import {
  createSeededRandom,
  seedFromPath,
  pick,
  randomInt,
  randomDollars,
  recentDate,
  seededUUID,
} from '../fixtures/seed.js'

describe('createSeededRandom', () => {
  it('produces numbers in [0, 1)', () => {
    const rng = createSeededRandom(42)
    for (let i = 0; i < 100; i++) {
      const val = rng()
      expect(val).toBeGreaterThanOrEqual(0)
      expect(val).toBeLessThan(1)
    }
  })

  it('is deterministic - same seed produces same sequence', () => {
    const rng1 = createSeededRandom(12345)
    const rng2 = createSeededRandom(12345)
    for (let i = 0; i < 50; i++) {
      expect(rng1()).toBe(rng2())
    }
  })

  it('different seeds produce different sequences', () => {
    const rng1 = createSeededRandom(1)
    const rng2 = createSeededRandom(2)
    const values1 = Array.from({ length: 10 }, () => rng1())
    const values2 = Array.from({ length: 10 }, () => rng2())
    expect(values1).not.toEqual(values2)
  })
})

describe('seedFromPath', () => {
  it('produces a consistent seed for the same input', () => {
    const s1 = seedFromPath('personal-finance', '/accounts')
    const s2 = seedFromPath('personal-finance', '/accounts')
    expect(s1).toBe(s2)
  })

  it('produces different seeds for different paths', () => {
    const s1 = seedFromPath('personal-finance', '/accounts')
    const s2 = seedFromPath('personal-finance', '/transactions')
    expect(s1).not.toBe(s2)
  })

  it('produces different seeds for different app types', () => {
    const s1 = seedFromPath('personal-finance', '/accounts')
    const s2 = seedFromPath('online-store', '/accounts')
    expect(s1).not.toBe(s2)
  })

  it('always returns a positive number', () => {
    const seeds = [
      seedFromPath('a', '/b'),
      seedFromPath('test', '/path'),
      seedFromPath('', ''),
    ]
    for (const s of seeds) {
      expect(s).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('pick', () => {
  it('returns an element from the array', () => {
    const rng = createSeededRandom(42)
    const arr = ['a', 'b', 'c', 'd', 'e'] as const
    for (let i = 0; i < 20; i++) {
      expect(arr).toContain(pick(rng, arr))
    }
  })

  it('is deterministic', () => {
    const arr = [1, 2, 3, 4, 5] as const
    const rng1 = createSeededRandom(99)
    const rng2 = createSeededRandom(99)
    for (let i = 0; i < 10; i++) {
      expect(pick(rng1, arr)).toBe(pick(rng2, arr))
    }
  })
})

describe('randomInt', () => {
  it('produces integers in [min, max]', () => {
    const rng = createSeededRandom(42)
    for (let i = 0; i < 100; i++) {
      const val = randomInt(rng, 5, 15)
      expect(val).toBeGreaterThanOrEqual(5)
      expect(val).toBeLessThanOrEqual(15)
      expect(Number.isInteger(val)).toBe(true)
    }
  })
})

describe('randomDollars', () => {
  it('produces values with at most 2 decimal places', () => {
    const rng = createSeededRandom(42)
    for (let i = 0; i < 50; i++) {
      const val = randomDollars(rng, 1, 100)
      const decimalPlaces = (val.toString().split('.')[1] || '').length
      expect(decimalPlaces).toBeLessThanOrEqual(2)
    }
  })

  it('produces values in [min, max]', () => {
    const rng = createSeededRandom(42)
    for (let i = 0; i < 50; i++) {
      const val = randomDollars(rng, 10, 500)
      expect(val).toBeGreaterThanOrEqual(10)
      expect(val).toBeLessThanOrEqual(500)
    }
  })
})

describe('recentDate', () => {
  it('returns a valid ISO date string', () => {
    const rng = createSeededRandom(42)
    const date = recentDate(rng)
    expect(new Date(date).toISOString()).toBe(date)
  })
})

describe('seededUUID', () => {
  it('returns a UUID-like string', () => {
    const rng = createSeededRandom(42)
    const uuid = seededUUID(rng)
    // UUID format: 8-4-4-4-12 hex characters
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  })

  it('is deterministic', () => {
    const rng1 = createSeededRandom(42)
    const rng2 = createSeededRandom(42)
    expect(seededUUID(rng1)).toBe(seededUUID(rng2))
  })
})
