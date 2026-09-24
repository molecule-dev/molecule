/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written — real otplib + qrcode, no mocks. The
 * user's authenticator app is simulated with otplib's own `generate()`.
 *
 * @module
 */
import { generate } from 'otplib'
import { describe, expect, it } from 'vitest'

import { generateSecret, getUrls, setProvider, verify } from '@molecule/api-two-factor'

import { provider } from '../index.js'

describe('README @example', () => {
  it('enrols a secret, accepts a fresh code once, and rejects its replay', async () => {
    setProvider(provider)

    const secret = generateSecret()
    const { keyUrl, QRImageUrl } = await getUrls({
      username: 'ada@example.com',
      service: 'Acme',
      secret,
    })

    async function checkCode(code: string, lastTimeStep: number | null): Promise<number | null> {
      const result = await verify({ secret, token: code, afterTimeStep: lastTimeStep ?? undefined })
      if (!result.valid) return null
      return result.timeStep ?? null
    }

    expect(keyUrl).toMatch(/^otpauth:\/\/totp\/.*issuer=Acme/)
    expect(QRImageUrl).toMatch(/^data:image\/png;base64,/)

    // The code the user reads off their authenticator app.
    const code = await generate({ secret })

    const firstStep = await checkCode(code, null)
    expect(typeof firstStep).toBe('number')

    // Same code again, with the persisted step → rejected as a replay.
    expect(await checkCode(code, firstStep)).toBeNull()
    const replay = await verify({ secret, token: code, afterTimeStep: firstStep ?? undefined })
    expect(replay).toEqual({ valid: false, reason: 'replay' })

    // A typo is a rejection, not a crash.
    expect(await verify({ secret, token: '12ab56' })).toEqual({ valid: false, reason: 'format' })
  })
})
