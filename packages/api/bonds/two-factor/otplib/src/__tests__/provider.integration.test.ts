/**
 * REAL-DEPENDENCY integration tests — no mocks, the actual otplib + qrcode.
 *
 * The unit suite (`provider.test.ts`) mocks otplib, so it can only validate OUR
 * assumptions about otplib — not otplib. That gap let two classes of problem ship
 * unfelt: API drift (otplib v13 made `generate` async and removed `authenticator`;
 * our docs still taught v12) and consumer-experience regressions (a past-only
 * `[30, 0]` tolerance expired legitimately generated codes during any flow slower
 * than ~30s — a real executor concluded the LIBRARY was broken and bypassed this
 * package). Every bond wrapping a pure-local dependency should carry a file like
 * this one; the unit mocks stay for shape/edge cases.
 *
 * @module
 */

import { generate } from 'otplib'
import { describe, expect, it } from 'vitest'

import { provider } from '../provider.js'

describe('@molecule/api-two-factor-otplib × REAL otplib', () => {
  it('full lifecycle: secret → QR → fresh code verifies → replay says WHY → wrong code rejects', async () => {
    const secret = provider.generateSecret()
    expect(secret.length).toBeGreaterThanOrEqual(16)

    const urls = await provider.getUrls({ username: 'user@example.com', service: 'MyApp', secret })
    expect(urls.keyUrl).toMatch(/^otpauth:\/\/totp\//)
    expect(urls.keyUrl).toContain('issuer=MyApp')
    // A data: URL proves the QR actually rendered — the executor-facing "QR is visible" proof.
    expect(urls.QRImageUrl).toMatch(/^data:image\/png;base64,/)

    const token = await generate({ secret })
    const ok = await provider.verify({ secret, token })
    expect(ok.valid).toBe(true)
    expect(Number.isInteger(ok.timeStep)).toBe(true)

    // Replay: same code with its own step as the guard — rejected AND labeled, so callers
    // can tell "wait for the next code" from "debug your wiring".
    const replayed = await provider.verify({ secret, token, afterTimeStep: ok.timeStep })
    expect(replayed).toEqual({ valid: false, reason: 'replay' })

    // A PAST guard step must not block a current code (the replay guard rejects <=, not <).
    const past = await provider.verify({
      secret,
      token,
      afterTimeStep: (ok.timeStep as number) - 10,
    })
    expect(past.valid).toBe(true)

    // A wrong code is a plain rejection — no replay label.
    const wrong = await provider.verify({ secret, token: '000000', afterTimeStep: ok.timeStep })
    expect(wrong).toEqual({ valid: false })
  })

  it('CONSUMER PROPERTY: a code generated 45s ago still verifies (slow human/agent flows)', async () => {
    // The regression this pins: past-only [30, 0] expired codes mid-flow — generate → hand
    // to the user/agent → fill → click → server verify routinely spans 30–60s. The default
    // window must absorb that. (45s ago is up to TWO steps back at a boundary; the [60, 30]
    // default covers two past steps, so this is deterministic.)
    const secret = provider.generateSecret()
    const oldToken = await generate({ secret, epoch: Math.floor(Date.now() / 1000) - 45 })
    const result = await provider.verify({ secret, token: oldToken })
    expect(result.valid).toBe(true)
  })

  it('CONSUMER PROPERTY: an authenticator-app formatted paste ("123 456 ") still verifies', async () => {
    // Google Authenticator DISPLAYS codes with grouping whitespace and users paste them
    // verbatim, often with a trailing space. Raw otplib THROWS TokenLengthError on the
    // 7-char string — the provider must normalize instead of failing the paste.
    const secret = provider.generateSecret()
    const token = await generate({ secret })
    const pasted = `${token.slice(0, 3)} ${token.slice(3)} `
    const result = await provider.verify({ secret, token: pasted })
    expect(result.valid).toBe(true)
    expect(Number.isInteger(result.timeStep)).toBe(true)
  })

  it('FAILURE DISAMBIGUATION: a malformed token is a labeled rejection, never a crash', async () => {
    // Raw otplib 13 THROWS (TokenLengthError / TokenFormatError) on all of these — an
    // unhandled user typo would 500 the login route with an opaque stack. The provider
    // answers { valid: false, reason: 'format' } so callers can tell "re-enter the
    // 6-digit code" apart from "wrong/expired" and from "already used".
    const secret = provider.generateSecret()
    expect(await provider.verify({ secret, token: '12345' })).toEqual({
      valid: false,
      reason: 'format',
    })
    expect(await provider.verify({ secret, token: 'abcdef' })).toEqual({
      valid: false,
      reason: 'format',
    })
    expect(await provider.verify({ secret, token: '' })).toEqual({
      valid: false,
      reason: 'format',
    })
  })

  it('a -1 "no previous step" column sentinel verifies instead of throwing', async () => {
    // Raw otplib 13 throws AfterTimeStepNegativeError on -1; a schema defaulting
    // last_time_step to -1 (instead of NULL) would make enabling 2FA impossible.
    // Like NULL/undefined, -1 means "no code consumed yet" — no replay guard.
    const secret = provider.generateSecret()
    const token = await generate({ secret })
    const result = await provider.verify({ secret, token, afterTimeStep: -1 })
    expect(result.valid).toBe(true)
  })

  it('FAILURE DISAMBIGUATION: a clock-rollback afterTimeStep never crashes with a raw otplib error', async () => {
    // Real trigger: the server clock moves BACKWARD (VM snapshot restore, NTP
    // correction, container clock drift) after a successful verify persisted
    // `timeStep`. Raw otplib 13 THROWS AfterTimeStepRangeExceededError ('Invalid
    // afterTimeStep: cannot be greater than current time step plus window') for
    // every subsequent login attempt — an opaque 500 that reads like "the library
    // is broken" rather than "the clock rolled back". The provider must instead
    // resolve, labeled the same way single-use replay protection is.
    const secret = provider.generateSecret()
    const token = await generate({ secret })
    // A persisted step far beyond anything reachable from "now" plus the default
    // future tolerance (1 step) — this is exactly the shape a rolled-back clock
    // produces relative to a step persisted before the rollback.
    const unreachableAfterTimeStep = Math.floor(Date.now() / 1000 / 30) + 1_000_000
    const result = await provider.verify({ secret, token, afterTimeStep: unreachableAfterTimeStep })
    expect(result).toEqual({ valid: false, reason: 'replay' })
  })

  it('BOUNDARY PROPERTY: verify() NEVER throws for any cursor × any custom epochTolerance', async () => {
    // otplib's reachability bound is `floor((epochSeconds + futureTolerance) / 30)`,
    // which depends on where "now" falls WITHIN the current 30s step — so for any
    // future tolerance that is not an exact multiple of 30 (an explicitly supported
    // caller override), a `currentStep + ceil(futureTolerance / 30)` pre-check
    // overshoots part of the time and lets a cursor through that real otplib rejects
    // with AfterTimeStepRangeExceededError. This sweep covers every cursor around the
    // boundary for a spread of non-multiple tolerances: the consumer property is that
    // NO combination may crash — each must resolve to a { valid: boolean } result.
    const secret = provider.generateSecret()
    const token = await generate({ secret })
    const currentStep = Math.floor(Date.now() / 1000 / 30)
    for (const future of [0, 1, 5, 15, 29, 30, 31, 45, 59, 60, 90]) {
      for (let cursor = currentStep - 2; cursor <= currentStep + 8; cursor++) {
        const result = await provider.verify({
          secret,
          token,
          afterTimeStep: cursor,
          epochTolerance: [60, future],
        })
        expect(typeof result.valid).toBe('boolean')
      }
    }
  })

  it('FAILURE DISAMBIGUATION: a corrupted (non-base32) stored secret throws a labeled, causal error', async () => {
    // A corrupted database record (truncated write, wrong encoding, bit rot) is
    // server-side data corruption, not an invalid code — verify() is right to THROW
    // rather than resolve `valid:false`. But raw otplib/scure surfaces a generic,
    // unbranded `Error: Invalid Base32 string: Unknown letter: "0". Allowed: ...` that
    // doesn't say which side failed or what to do about it. The provider must rewrap
    // it with context, preserving the original as `cause` for real debugging.
    await expect(
      provider.verify({ secret: '0189-INVALID!!!', token: '123456' }),
    ).rejects.toMatchObject({
      message: expect.stringContaining('re-run setup'),
      cause: expect.objectContaining({ message: expect.stringContaining('Base32') }),
    })
  })

  it('honors a strict caller override: [30, 0] rejects a stale code the default would too', async () => {
    // 90s is a multiple of the 30s step, so this code is ALWAYS exactly 3 steps old —
    // deterministically outside both [30, 0] and the [60, 30] default. (45s would flake:
    // near a step boundary it is only ONE step back, which even [30, 0] accepts.)
    const secret = provider.generateSecret()
    const staleToken = await generate({ secret, epoch: Math.floor(Date.now() / 1000) - 90 })
    const strict = await provider.verify({ secret, token: staleToken, epochTolerance: [30, 0] })
    expect(strict.valid).toBe(false)
  })
})
