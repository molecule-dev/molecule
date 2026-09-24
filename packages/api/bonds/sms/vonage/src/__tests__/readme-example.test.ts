/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the `@vonage/server-sdk` client
 * (the network) is mocked.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { getStatus, send, setProvider } from '@molecule/api-sms'

const vonage = vi.hoisted(() => ({
  credentials: [] as unknown[],
  send: vi.fn(async (params: { to: string }) => ({
    messages: [{ to: params.to, messageId: '0A0000000123ABCD1', status: '0' }],
  })),
}))

vi.mock('@vonage/server-sdk', () => ({
  Vonage: class {
    sms = { send: vonage.send }
    constructor(credentials: unknown) {
      vonage.credentials.push(credentials)
    }
  },
}))

import { createProvider } from '../index.js'

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('sends through Vonage with a delivery-receipt callback', async () => {
    vi.stubEnv('VONAGE_API_KEY', 'test-key')
    vi.stubEnv('VONAGE_API_SECRET', 'test-secret')
    vi.stubEnv('VONAGE_FROM_NUMBER', '15557654321')

    setProvider(
      createProvider({
        apiKey: process.env.VONAGE_API_KEY,
        apiSecret: process.env.VONAGE_API_SECRET,
        defaultFrom: process.env.VONAGE_FROM_NUMBER,
      }),
    )

    const result = await send('15551234567', 'Your verification code is 123456', {
      callbackUrl: 'https://api.example.com/webhooks/vonage/dlr',
    })

    expect(vonage.credentials[0]).toEqual({ apiKey: 'test-key', apiSecret: 'test-secret' })
    expect(vonage.send).toHaveBeenCalledWith({
      to: '15551234567',
      from: '15557654321',
      text: 'Your verification code is 123456',
      callback: 'https://api.example.com/webhooks/vonage/dlr',
      statusReportReq: true,
    })
    expect(result).toEqual({ id: '0A0000000123ABCD1', status: 'queued', to: '15551234567' })

    // Remark: status polling is not supported by Vonage.
    await expect(getStatus(result.id)).rejects.toThrow(/does not support message status polling/)
  })
})
