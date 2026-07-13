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
