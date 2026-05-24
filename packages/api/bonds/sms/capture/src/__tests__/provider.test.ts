import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SMSProvider, SMSResult } from '@molecule/api-sms'

const record = vi.fn(() => Promise.resolve())

vi.mock('@molecule/api-activity', () => ({
  record: (...args: unknown[]) => record(...args),
}))

import { createSMSCaptureProvider, provider } from '../provider.js'

describe('sms capture provider', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    record.mockResolvedValue(undefined)
  })

  it('exports a default provider', () => {
    expect(typeof provider.send).toBe('function')
  })

  describe('intercept-only', () => {
    it('records a captured event and returns a synthetic SMSResult', async () => {
      const sms = createSMSCaptureProvider()
      const result = await sms.send('+15551234567', 'Your code is 1234')

      expect(result.id).toMatch(/^captured-/)
      expect(result.status).toBe('sent')
      expect(result.to).toBe('+15551234567')

      expect(record).toHaveBeenCalledTimes(1)
      const event = record.mock.calls[0][0]
      expect(event.type).toBe('sms')
      expect(event.status).toBe('captured')
      expect(event.recipient).toBe('+15551234567')
      expect(event.summary).toBe('Your code is 1234')
    })

    it('records one event per message in sendBulk', async () => {
      const sms = createSMSCaptureProvider()
      const bulk = await sms.sendBulk([
        { to: '+1', message: 'a' },
        { to: '+2', message: 'b' },
      ])
      expect(bulk.total).toBe(2)
      expect(bulk.successful).toBe(2)
      expect(bulk.failed).toBe(0)
      expect(record).toHaveBeenCalledTimes(2)
    })

    it('returns a synthetic status from getStatus', async () => {
      const sms = createSMSCaptureProvider()
      const status = await sms.getStatus('captured-x')
      expect(status).toEqual({ id: 'captured-x', status: 'sent' })
    })
  })

  describe('delegate + tee', () => {
    it('delegates send and records a sent event', async () => {
      const realResult: SMSResult = { id: 'real-1', status: 'queued', to: '+15551234567' }
      const real: SMSProvider = {
        send: vi.fn(() => Promise.resolve(realResult)),
        sendBulk: vi.fn(),
        getStatus: vi.fn(),
      }
      const sms = createSMSCaptureProvider(real)

      const result = await sms.send('+15551234567', 'hi')
      expect(real.send).toHaveBeenCalledWith('+15551234567', 'hi', undefined)
      expect(result).toBe(realResult)
      expect(record.mock.calls[0][0].status).toBe('sent')
    })

    it('records a failed event and rethrows', async () => {
      const real: SMSProvider = {
        send: vi.fn(() => Promise.reject(new Error('twilio error'))),
        sendBulk: vi.fn(),
        getStatus: vi.fn(),
      }
      const sms = createSMSCaptureProvider(real)
      await expect(sms.send('+1', 'x')).rejects.toThrow('twilio error')
      expect(record.mock.calls[0][0].status).toBe('failed')
    })

    it('delegates getStatus to the real provider', async () => {
      const real: SMSProvider = {
        send: vi.fn(),
        sendBulk: vi.fn(),
        getStatus: vi.fn(() => Promise.resolve({ id: 'real-1', status: 'delivered' as const })),
      }
      const sms = createSMSCaptureProvider(real)
      const status = await sms.getStatus('real-1')
      expect(real.getStatus).toHaveBeenCalledWith('real-1')
      expect(status.status).toBe('delivered')
    })
  })
})
