/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real Twilio bond with
 * only the `twilio` SDK mocked (the same way the bond's own tests do).
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

const { mockCreate, mockFetch, MockTwilio } = vi.hoisted(() => {
  const mockCreate = vi.fn()
  const mockFetch = vi.fn()
  const mockMessages = Object.assign(
    vi.fn((_sid?: string) => ({ fetch: mockFetch })),
    { create: mockCreate },
  )
  const MockTwilio = vi.fn(() => ({ messages: mockMessages }))
  return { mockCreate, mockFetch, MockTwilio }
})

vi.mock('twilio', () => ({ default: MockTwilio }))

import { createProvider } from '@molecule/api-sms-twilio'

import { getStatus, send, setProvider } from '../index.js'

describe('README @example', () => {
  afterEach(() => {
    delete process.env.TWILIO_ACCOUNT_SID
    delete process.env.TWILIO_AUTH_TOKEN
    delete process.env.TWILIO_FROM_NUMBER
  })

  it('sends through the bonded provider and polls its delivery status', async () => {
    process.env.TWILIO_ACCOUNT_SID = 'ACtest'
    process.env.TWILIO_AUTH_TOKEN = 'test-token'
    process.env.TWILIO_FROM_NUMBER = '+15551234567'
    mockCreate.mockResolvedValue({ sid: 'SM123', status: 'queued', to: '+15557654321' })
    mockFetch.mockResolvedValue({ sid: 'SM123', status: 'delivered', dateUpdated: new Date() })

    setProvider(
      createProvider({
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        defaultFrom: process.env.TWILIO_FROM_NUMBER,
      }),
    )

    const result = await send('+15557654321', 'Your verification code is 482913')
    expect(result).toEqual({ id: 'SM123', status: 'queued', to: '+15557654321' })
    expect(MockTwilio).toHaveBeenCalledWith('ACtest', 'test-token')
    expect(mockCreate).toHaveBeenCalledWith({
      to: '+15557654321',
      from: '+15551234567',
      body: 'Your verification code is 482913',
    })

    const status = await getStatus(result.id)
    expect(status.status).toBe('delivered')
  })
})
