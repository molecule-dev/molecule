/**
 * REAL-DEPENDENCY integration tests — no mocks, the actual bcryptjs.
 *
 * The unit suite (`provider.test.ts`) mocks bcryptjs, so it can only validate OUR
 * assumptions about bcryptjs — not bcryptjs. These tests pin the semantics a consumer
 * actually experiences: the default cost really is 12, the env clamp really bounds an
 * exponential knob (bcryptjs happily accepts cost 32 = HOURS per hash, silently), the
 * 72-BYTE truncation is real (tails past 72 bytes are ignored on compare), and the
 * failure modes are distinguishable (wrong password vs corrupted stored hash vs a
 * wiring bug passing `undefined`). Every bond wrapping a pure-local dependency should
 * carry a file like this one; the unit mocks stay for shape/edge cases.
 *
 * @module
 */

import { afterEach, describe, expect, it } from 'vitest'

import { provider } from '../provider.js'

/** Extracts the cost factor a bcrypt hash was generated with (`$2b$12$...` → 12). */
const costOf = (hash: string): number => Number(hash.split('$')[2])

describe('@molecule/api-password-bcrypt × REAL bcryptjs', () => {
  afterEach(() => {
    delete process.env.SALT_ROUNDS
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
    // column) THROWS `Illegal arguments` — a crash the caller can tell apart from a
    // wrong password, pointing at their own wiring instead of the user's input.
    await expect(provider.compare('pw', undefined as unknown as string)).rejects.toThrow(
      /Illegal arguments/,
    )
  })
})
