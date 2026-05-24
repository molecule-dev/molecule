import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChannelProvider, OutboundMessage, SendResult } from '@molecule/api-channel'

const record = vi.fn(() => Promise.resolve())

vi.mock('@molecule/api-activity', () => ({
  record: (...args: unknown[]) => record(...args),
}))

import { createChannelCaptureProvider, provider } from '../provider.js'

const message: OutboundMessage = { kind: 'text', text: 'Build deployed' }

describe('channel capture provider', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    record.mockResolvedValue(undefined)
  })

  it('exports a default provider', () => {
    expect(typeof provider.sendMessage).toBe('function')
    expect(provider.name).toBe('capture')
  })

  describe('intercept-only', () => {
    it('records a captured event and returns a synthetic SendResult', async () => {
      const channel = createChannelCaptureProvider()
      const result = await channel.sendMessage('#general', message)

      expect(result.messageId).toMatch(/^captured-/)
      expect(result.deliveredAt).toBeInstanceOf(Date)

      expect(record).toHaveBeenCalledTimes(1)
      const event = record.mock.calls[0][0]
      expect(event.type).toBe('channel')
      expect(event.status).toBe('captured')
      expect(event.recipient).toBe('#general')
      expect(event.summary).toBe('Build deployed')
    })

    it('returns intercept-only defaults for signature/inbound/features', () => {
      const channel = createChannelCaptureProvider()
      expect(channel.verifyWebhookSignature({}, '')).toBe(false)
      expect(channel.listSupportedFeatures().signedWebhooks).toBe(false)
      const inbound = channel.parseInbound({ raw: true })
      expect(inbound.channel).toBe('capture')
      expect(inbound.payload).toEqual({ raw: true })
    })
  })

  describe('delegate + tee', () => {
    it('delegates sendMessage and records a sent event', async () => {
      const realResult: SendResult = { messageId: 'real-1', deliveredAt: new Date() }
      const real: ChannelProvider = {
        name: 'slack',
        sendMessage: vi.fn(() => Promise.resolve(realResult)),
        verifyWebhookSignature: vi.fn(() => true),
        parseInbound: vi.fn(),
        listSupportedFeatures: vi.fn(),
      }
      const channel = createChannelCaptureProvider(real)

      expect(channel.name).toBe('slack')
      const result = await channel.sendMessage('#general', message)
      expect(real.sendMessage).toHaveBeenCalledWith('#general', message)
      expect(result).toBe(realResult)
      expect(record.mock.calls[0][0].status).toBe('sent')
    })

    it('records a failed event and rethrows', async () => {
      const real: ChannelProvider = {
        name: 'slack',
        sendMessage: vi.fn(() => Promise.reject(new Error('rate limited'))),
        verifyWebhookSignature: vi.fn(),
        parseInbound: vi.fn(),
        listSupportedFeatures: vi.fn(),
      }
      const channel = createChannelCaptureProvider(real)
      await expect(channel.sendMessage('#general', message)).rejects.toThrow('rate limited')
      expect(record.mock.calls[0][0].status).toBe('failed')
    })

    it('delegates signature + features to the real provider', () => {
      const real: ChannelProvider = {
        name: 'slack',
        sendMessage: vi.fn(),
        verifyWebhookSignature: vi.fn(() => true),
        parseInbound: vi.fn(),
        listSupportedFeatures: vi.fn(() => ({
          text: true,
          buttons: false,
          attachments: false,
          threads: false,
          signedWebhooks: true,
        })),
      }
      const channel = createChannelCaptureProvider(real)
      expect(channel.verifyWebhookSignature({}, '')).toBe(true)
      expect(channel.listSupportedFeatures().signedWebhooks).toBe(true)
    })
  })
})
