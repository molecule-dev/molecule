/**
 * Deterministic seeded PRNG for stable fixture generation.
 * Uses Mulberry32 algorithm for fast, reproducible random numbers.
 */

/**
 * Create a seeded random number generator using Mulberry32.
 * Returns a function that produces numbers in [0, 1).
 * @param seed - The seed value
 * @returns A function that returns the next pseudo-random number
 */
export function createSeededRandom(seed: number): () => number {
  let s = seed | 0
  return function mulberry32(): number {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Derive a deterministic seed from an app type and endpoint path.
 * The same app+path always produces the same seed, ensuring stable fixture output.
 * @param appType - The application type (e.g. 'personal-finance')
 * @param path - The endpoint path (e.g. '/accounts')
 * @returns A numeric seed value
 */
export function seedFromPath(appType: string, path: string): number {
  const str = `${appType}:${path}`
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash + char) | 0
  }
  // Ensure positive
  return hash >>> 0
}

/**
 * Pick a random element from an array using the RNG.
 * @param rng - The seeded random function
 * @param arr - The array to pick from
 * @returns A random element from the array
 */
export function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]
}

/**
 * Pick a random integer in [min, max] inclusive.
 * @param rng - The seeded random function
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @returns A random integer in the given range
 */
export function randomInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min
}

/**
 * Generate a random dollar amount rounded to cents.
 * @param rng - The seeded random function
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns A number rounded to 2 decimal places
 */
export function randomDollars(rng: () => number, min: number, max: number): number {
  return Math.round((rng() * (max - min) + min) * 100) / 100
}

/**
 * Generate a recent ISO date string within the last N days.
 * @param rng - The seeded random function
 * @param daysBack - Maximum days in the past (default 90)
 * @returns An ISO date string
 */
export function recentDate(rng: () => number, daysBack = 90): string {
  const now = new Date('2026-04-01T12:00:00Z')
  const offset = Math.floor(rng() * daysBack) * 24 * 60 * 60 * 1000
  return new Date(now.getTime() - offset).toISOString()
}

/**
 * Generate a UUID-like string from the RNG (not cryptographically secure).
 * @param rng - The seeded random function
 * @returns A UUID v4-like string
 */
export function seededUUID(rng: () => number): string {
  const hex = (n: number): string => {
    let result = ''
    for (let i = 0; i < n; i++) {
      result += Math.floor(rng() * 16).toString(16)
    }
    return result
  }
  return `${hex(8)}-${hex(4)}-4${hex(3)}-${hex(1)}${hex(3)}-${hex(12)}`
}

/**
 * Generate a future ISO date string within the next N days.
 * @param rng - The seeded random function
 * @param daysAhead - Maximum days in the future (default 365)
 * @returns An ISO date string
 */
export function futureDate(rng: () => number, daysAhead = 365): string {
  const now = new Date('2026-04-01T12:00:00Z')
  const offset = Math.floor(rng() * daysAhead) * 24 * 60 * 60 * 1000
  return new Date(now.getTime() + offset).toISOString()
}
