/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the `twilio` SDK (the network)
 * is mocked.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { getStatus, send, setProvider } from '@molecule/api-sms'

const twilio = vi.hoisted(() => {
  const create = vi.fn(async (params: { to: string; from: string; body: string }) => ({
    sid: 'SM-test-message-sid',
    status: 'queued',
    to: params.to,
  }))
  const fetch = vi.fn(async () => ({
    sid: 'SM-test-message-sid',
    status: 'delivered',
    dateUpdated: new Date('2026-09-24T12:00:05Z'),
    errorMessage: null,
  }))
  const messages = Object.assign((_sid: string) => ({ fetch }), { create })
  const factory = vi.fn((_sid: string, _token: string) => ({ messages }))
  return { create, fetch, factory }
})

vi.mock('twilio', () => ({ default: twilio.factory }))

import { createProvider } from '../index.js'

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('sends through Twilio and reads back the delivery status', async () => {
    vi.stubEnv('TWILIO_ACCOUNT_SID', 'AC-test-sid')
    vi.stubEnv('TWILIO_AUTH_TOKEN', 'test-token')
    vi.stubEnv('TWILIO_FROM_NUMBER', '+15557654321')

    setProvider(
      createProvider({
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        defaultFrom: process.env.TWILIO_FROM_NUMBER,
      }),
    )

    const result = await send('+15551234567', 'Your verification code is 123456')

    const status = await getStatus(result.id)

    expect(twilio.factory).toHaveBeenCalledWith('AC-test-sid', 'test-token')
    expect(twilio.create).toHaveBeenCalledWith({
      to: '+15551234567',
      from: '+15557654321',
      body: 'Your verification code is 123456',
    })
    expect(result).toEqual({
      id: 'SM-test-message-sid',
      status: 'queued',
      to: '+15551234567',
    })
    expect(status).toEqual({
      id: 'SM-test-message-sid',
      status: 'delivered',
      deliveredAt: new Date('2026-09-24T12:00:05Z'),
    })
  })
})
