/**
 * REAL-DEPENDENCY integration tests — no mocks, the actual native `bcrypt` and
 * the actual `bcryptjs`.
 *
 * The unit suite (`provider.test.ts`) mocks both, so it can only validate OUR
 * assumptions about them — not them. These tests pin the semantics a consumer
 * actually experiences: the native addon really loads and is really what runs,
 * the default cost really is 12, the env clamp really bounds an exponential knob
 * (bcrypt happily accepts cost 32 = HOURS per hash, silently), the 72-BYTE
 * truncation is real (tails past 72 bytes are ignored on compare), a hash written
 * by either implementation verifies in the other, hashing does not block the
 * event loop, and the failure modes are distinguishable (wrong password vs
 * corrupted stored hash vs a wiring bug passing `undefined`). Every bond wrapping
 * a pure-local dependency should carry a file like this one; the unit mocks stay
 * for shape/edge cases.
 *
 * @module
 */

import bcryptjs from 'bcryptjs'
import { afterEach, describe, expect, it } from 'vitest'

import { loadNativeBcrypt, provider } from '../provider.js'

/** Extracts the cost factor a bcrypt hash was generated with (`$2b$12$...` → 12). */
const costOf = (hash: string): number => Number(hash.split('$')[2])

/**
 * Counts how many times a 5 ms timer fires while `work` runs.
 *
 * This is the measurement the whole native-vs-bcryptjs decision turns on. A
 * cost-12 hash on the native addon runs on a libuv threadpool thread and leaves
 * the loop free, so the timer keeps its cadence (~45 ticks). bcryptjs computes in
 * JavaScript and yields only between ~100 ms chunks, so the same hash lets the
 * timer run two or three times. The margin is an order of magnitude, so the
 * threshold below is not a tuned number.
 *
 * @param work - The async work to measure across.
 * @returns The number of timer ticks observed during `work`.
 */
const ticksDuring = async (work: () => Promise<unknown>): Promise<number> => {
  let ticks = 0
  const timer = setInterval(() => {
    ticks++
  }, 5)
  try {
    await work()
  } finally {
    clearInterval(timer)
  }
  return ticks
}

describe('@molecule/api-password-bcrypt × REAL bcrypt', () => {
  afterEach(() => {
    delete process.env.SALT_ROUNDS
  })

  it('CONSUMER PROPERTY: hashing does not block the event loop', async () => {
    // The regression guard for the reason the native addon is here at all. On
    // the pure-JS path this measures 2–3 ticks and the assertion fails.
    const ticks = await ticksDuring(() => provider.hash('correct horse battery staple'))

    expect(ticks).toBeGreaterThanOrEqual(10)
  })

  it('CONSUMER PROPERTY: the native addon loads here, and both implementations write interchangeable hashes', async () => {
    // If this fails the fallback is silently carrying every hash — correct, but
    // ~1.2x slower and blocking, which is the whole thing this bond avoids.
    const native = await loadNativeBcrypt()
    expect(native, 'the native `bcrypt` addon must load on this platform').not.toBeNull()

    const ours = await provider.hash('correct horse battery staple')
    expect(ours).toMatch(/^\$2b\$12\$/)
    expect(costOf(ours)).toBe(12)

    // A hash this bond wrote verifies under the pure-JS implementation…
    await expect(bcryptjs.compare('correct horse battery staple', ours)).resolves.toBe(true)
    await expect(bcryptjs.compare('wrong', ours)).resolves.toBe(false)

    // …and one bcryptjs wrote verifies through this bond (what a project that
    // stored hashes before this change already has in its users table).
    const stored = await bcryptjs.hash('correct horse battery staple', 12)
    await expect(provider.compare('correct horse battery staple', stored)).resolves.toBe(true)
    await expect(provider.compare('wrong', stored)).resolves.toBe(false)
  })

  it('verifies a $2a$-prefixed hash written by an OLDER bcryptjs (prefix compatibility)', async () => {
    // bcryptjs used to default to the `$2a$` prefix. Accounts hashed back then
    // must keep logging in: the native addon's verifier handles every prefix the
    // pure-JS one wrote, which is what makes this switch safe to ship.
    const legacy = bcryptjs.hashSync(
      'legacy-password',
      '$2a$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquz',
    )

    expect(legacy.startsWith('$2a$12$')).toBe(true)
    await expect(provider.compare('legacy-password', legacy)).resolves.toBe(true)
    await expect(provider.compare('not-the-password', legacy)).resolves.toBe(false)
  })

  it('full lifecycle: hash → correct password matches, wrong password does not, default cost is 12', async () => {
    delete process.env.SALT_ROUNDS
    const hash = await provider.hash('correct horse battery staple')

    // Real bcrypt output, not a mock echo.
    expect(hash).toMatch(/^\$2[aby]\$\d\d\$/)
    // The documented default cost — weak-default regressions surface here.
    expect(costOf(hash)).toBe(12)
    // Salted: hashing the same password twice never yields the same hash…
    expect(await provider.hash('correct horse battery staple', 10)).not.toBe(hash)

    // …yet compare still works (the salt lives inside the hash).
    await expect(provider.compare('correct horse battery staple', hash)).resolves.toBe(true)
    await expect(provider.compare('correct horse battery stapl', hash)).resolves.toBe(false)
    await expect(provider.compare('', hash)).resolves.toBe(false)
  })

  it('CONSUMER PROPERTY: the SALT_ROUNDS env default is clamped — a too-low value is raised to 10', async () => {
    // The cost factor is EXPONENTIAL. bcryptjs itself accepts absurd values in both
    // directions (4 = trivially crackable, 32 = hours per hash with zero error output),
    // so a misconfigured .env must not be forwarded verbatim. The floor is provable
    // cheaply; the 16 ceiling exists in the same expression (a cost-16 hash takes ~4s,
    // so we don't burn it here — the core package's unit suite pins the ceiling).
    process.env.SALT_ROUNDS = '4'
    const hash = await provider.hash('pw')
    expect(costOf(hash)).toBe(10)

    // An in-range env value is honored as-is.
    process.env.SALT_ROUNDS = '11'
    expect(costOf(await provider.hash('pw'))).toBe(11)

    // An explicit argument is a deliberate caller choice — NOT clamped.
    expect(costOf(await provider.hash('pw', 6))).toBe(6)
  })

  it('CONSUMER PROPERTY: bcrypt reads only the first 72 BYTES — differing tails compare equal', async () => {
    // Real, surprising bcrypt semantics that consumers must design around (documented
    // in the module @remarks): a long passphrase (or an app-prepended prefix) that
    // pushes user-controlled bytes past 72 makes the tail meaningless.
    const first72 = 'a'.repeat(72)
    const hash = await provider.hash(`${first72}-tail-ONE`, 10)

    await expect(provider.compare(`${first72}-tail-TWO`, hash)).resolves.toBe(true)
    // But the cap is exactly 72: byte 72 still matters.
    await expect(provider.compare('a'.repeat(71), hash)).resolves.toBe(false)
    await expect(provider.compare(`${'a'.repeat(71)}b`, hash)).resolves.toBe(false)
  })

  it('handles multi-byte UTF-8 passwords (emoji roundtrip)', async () => {
    const hash = await provider.hash('pässwörd-🔒✨', 10)
    await expect(provider.compare('pässwörd-🔒✨', hash)).resolves.toBe(true)
    await expect(provider.compare('pässwörd-🔒', hash)).resolves.toBe(false)
  })

  it('FAILURE DISAMBIGUATION: corrupted stored hash → false; undefined hash → throws (wiring bug)', async () => {
    // A malformed/non-bcrypt stored hash compares `false` — deliberately
    // indistinguishable from a wrong password (no user enumeration oracle).
    await expect(provider.compare('pw', 'not-a-bcrypt-hash')).resolves.toBe(false)
    await expect(provider.compare('pw', '')).resolves.toBe(false)
    // …but passing `undefined` (e.g. an OAuth-only account row with no passwordHash
    // column) THROWS — a crash the caller can tell apart from a wrong password,
    // pointing at their own wiring instead of the user's input.
    await expect(provider.compare('pw', undefined as unknown as string)).rejects.toThrow(
      /needs the stored hash as a string/,
    )
    // The message is OURS, not the loaded library's: the two implementations
    // raise their own text ("Illegal arguments" vs "data and hash arguments
    // required"), and a consumer must not have to know which one is live.
    await expect(provider.compare('pw', undefined as unknown as string)).rejects.toThrow(TypeError)
  })
})
