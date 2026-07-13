import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { EmailMessage, EmailSendResult, EmailTransport } from '@molecule/api-emails'

const record = vi.fn(() => Promise.resolve())

vi.mock('@molecule/api-activity', () => ({
  record: (...args: unknown[]) => record(...args),
}))

import { createEmailCaptureProvider, provider } from '../provider.js'

const message: EmailMessage = {
  from: 'noreply@example.com',
  to: 'user@example.com',
  subject: 'Welcome',
  text: 'Hello',
}

describe('email capture provider', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    record.mockResolvedValue(undefined)
  })

  it('exports a default provider', () => {
    expect(typeof provider.sendMail).toBe('function')
  })

  describe('intercept-only (no real transport)', () => {
    it('records a captured event and returns a synthetic result', async () => {
      const transport = createEmailCaptureProvider()
      const result = await transport.sendMail(message)

      expect(result.accepted).toEqual(['user@example.com'])
      expect(result.rejected).toEqual([])
      expect(result.messageId).toMatch(/^captured-/)

      expect(record).toHaveBeenCalledTimes(1)
      const event = record.mock.calls[0][0]
      expect(event.type).toBe('email')
      expect(event.status).toBe('captured')
      expect(event.recipient).toBe('user@example.com')
      expect(event.summary).toBe('Welcome')
      expect(event.result).toBe(result)
    })

    it('normalizes array + object recipients', async () => {
      const transport = createEmailCaptureProvider()
      const result = await transport.sendMail({
        ...message,
        to: ['a@example.com', { name: 'B', address: 'b@example.com' }],
      })
      expect(result.accepted).toEqual(['a@example.com', 'b@example.com'])
    })
  })

  describe('delegate + tee (real transport)', () => {
    it('delegates and records a sent event', async () => {
      const realResult: EmailSendResult = {
        accepted: ['user@example.com'],
        rejected: [],
        messageId: 'real-123',
      }
      const real: EmailTransport = { sendMail: vi.fn(() => Promise.resolve(realResult)) }
      const transport = createEmailCaptureProvider(real)

      const result = await transport.sendMail(message)
      expect(real.sendMail).toHaveBeenCalledWith(message)
      expect(result).toBe(realResult)

      expect(record).toHaveBeenCalledTimes(1)
      const event = record.mock.calls[0][0]
      expect(event.status).toBe('sent')
      expect(event.result).toBe(realResult)
    })

    it('records a failed event and rethrows when the real transport throws', async () => {
      const real: EmailTransport = {
        sendMail: vi.fn(() => Promise.reject(new Error('smtp down'))),
      }
      const transport = createEmailCaptureProvider(real)

      await expect(transport.sendMail(message)).rejects.toThrow('smtp down')
      expect(record).toHaveBeenCalledTimes(1)
      expect(record.mock.calls[0][0].status).toBe('failed')
    })

    it('FAILURE DISAMBIGUATION: a throwing ActivitySink does NOT turn a successful real send into a rejection', async () => {
      record.mockRejectedValue(new Error('sink is down'))
      const realResult: EmailSendResult = {
        accepted: ['user@example.com'],
        rejected: [],
        messageId: 'real-456',
      }
      const real: EmailTransport = { sendMail: vi.fn(() => Promise.resolve(realResult)) }
      const transport = createEmailCaptureProvider(real)

      // The real transport already succeeded — the caller must see that
      // success, not the sink's failure (which would cause a retry and a
      // duplicate email to the recipient).
      await expect(transport.sendMail(message)).resolves.toBe(realResult)
    })

    it('FAILURE DISAMBIGUATION: a throwing ActivitySink does NOT mask the real transport error with the sink error', async () => {
      record.mockRejectedValue(new Error('sink is down'))
      const real: EmailTransport = {
        sendMail: vi.fn(() => Promise.reject(new Error('smtp down'))),
      }
      const transport = createEmailCaptureProvider(real)

      // The caller must see WHY the send actually failed, not a sink error
      // that has nothing to do with email delivery.
      await expect(transport.sendMail(message)).rejects.toThrow('smtp down')
    })
  })

  describe('when the ActivitySink throws (intercept-only path)', () => {
    it('still returns the synthetic captured result', async () => {
      record.mockRejectedValue(new Error('sink is down'))
      const transport = createEmailCaptureProvider()

      const result = await transport.sendMail(message)
      expect(result.messageId).toMatch(/^captured-/)
      expect(result.accepted).toEqual(['user@example.com'])
    })
  })
})
