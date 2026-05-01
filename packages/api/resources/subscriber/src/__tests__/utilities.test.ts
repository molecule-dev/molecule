import { describe, expect, it } from 'vitest'

import type { SubscriberRow } from '../types.js'
import {
  generateToken,
  isSubscriberChannel,
  isSubscriberStatus,
  isValidAddress,
  parseMetadata,
  toPublicSubscriber,
} from '../utilities.js'

describe('@molecule/api-resource-subscriber utilities', () => {
  describe('generateToken', () => {
    it('returns a non-empty url-safe string', () => {
      const tok = generateToken()
      expect(tok).toMatch(/^[A-Za-z0-9_-]+$/)
      expect(tok.length).toBeGreaterThanOrEqual(40)
    })

    it('produces unique tokens across calls', () => {
      const tokens = new Set(Array.from({ length: 100 }, () => generateToken()))
      expect(tokens.size).toBe(100)
    })

    it('respects the byte length parameter', () => {
      // 16 bytes -> 22 base64url chars
      const tok = generateToken(16)
      expect(tok.length).toBeGreaterThanOrEqual(20)
      expect(tok.length).toBeLessThanOrEqual(24)
    })
  })

  describe('isValidAddress', () => {
    it('accepts well-formed email', () => {
      expect(isValidAddress('email', 'a@b.co')).toBe(true)
      expect(isValidAddress('email', 'first.last+tag@sub.example.com')).toBe(true)
    })

    it('rejects malformed email', () => {
      expect(isValidAddress('email', 'no-at-sign')).toBe(false)
      expect(isValidAddress('email', 'a@b')).toBe(false)
      expect(isValidAddress('email', '')).toBe(false)
    })

    it('accepts E.164 phone numbers', () => {
      expect(isValidAddress('sms', '+14155550123')).toBe(true)
      expect(isValidAddress('sms', '14155550123')).toBe(true)
    })

    it('rejects malformed phone numbers', () => {
      expect(isValidAddress('sms', '0123')).toBe(false)
      expect(isValidAddress('sms', 'not-a-number')).toBe(false)
    })

    it('accepts http(s) webhook URLs', () => {
      expect(isValidAddress('webhook', 'https://example.com/hook')).toBe(true)
      expect(isValidAddress('webhook', 'http://localhost:3000/in')).toBe(true)
    })

    it('rejects non-http webhook URLs', () => {
      expect(isValidAddress('webhook', 'ftp://example.com')).toBe(false)
      expect(isValidAddress('webhook', 'example.com')).toBe(false)
    })

    it('rejects empty/non-string addresses', () => {
      expect(isValidAddress('email', '')).toBe(false)
      // @ts-expect-error — runtime guard against bad input
      expect(isValidAddress('email', null)).toBe(false)
    })
  })

  describe('isSubscriberChannel', () => {
    it('returns true for valid channels', () => {
      expect(isSubscriberChannel('email')).toBe(true)
      expect(isSubscriberChannel('sms')).toBe(true)
      expect(isSubscriberChannel('webhook')).toBe(true)
    })

    it('returns false for unknown channels and non-strings', () => {
      expect(isSubscriberChannel('push')).toBe(false)
      expect(isSubscriberChannel(undefined)).toBe(false)
      expect(isSubscriberChannel(42)).toBe(false)
    })
  })

  describe('isSubscriberStatus', () => {
    it('returns true for valid statuses', () => {
      expect(isSubscriberStatus('pending')).toBe(true)
      expect(isSubscriberStatus('confirmed')).toBe(true)
      expect(isSubscriberStatus('unsubscribed')).toBe(true)
    })

    it('returns false for unknown statuses', () => {
      expect(isSubscriberStatus('archived')).toBe(false)
      expect(isSubscriberStatus(null)).toBe(false)
    })
  })

  describe('parseMetadata', () => {
    it('returns null for null/undefined', () => {
      expect(parseMetadata(null)).toBeNull()
    })

    it('passes through object values', () => {
      const obj = { foo: 'bar' }
      expect(parseMetadata(obj)).toBe(obj)
    })

    it('parses JSON-string values', () => {
      expect(parseMetadata('{"foo":"bar"}')).toEqual({ foo: 'bar' })
    })

    it('returns null on invalid JSON', () => {
      expect(parseMetadata('not-json')).toBeNull()
    })

    it('returns null on JSON that does not produce an object', () => {
      expect(parseMetadata('"a-string"')).toBeNull()
      expect(parseMetadata('123')).toBeNull()
    })
  })

  describe('toPublicSubscriber', () => {
    const row: SubscriberRow = {
      id: 'sub-1',
      channel: 'email',
      address: 'a@b.co',
      topic: 'incident-updates',
      status: 'confirmed',
      confirmToken: 'secret-confirm',
      unsubscribeToken: 'secret-unsub',
      metadata: '{"locale":"en-US"}',
      confirmedAt: '2026-05-01T12:00:00.000Z',
      unsubscribedAt: null,
      createdAt: '2026-05-01T11:00:00.000Z',
      updatedAt: '2026-05-01T12:00:00.000Z',
    }

    it('strips token fields from the public view', () => {
      const pub = toPublicSubscriber(row) as Record<string, unknown>
      expect(pub).not.toHaveProperty('confirmToken')
      expect(pub).not.toHaveProperty('unsubscribeToken')
    })

    it('parses serialized metadata', () => {
      const pub = toPublicSubscriber(row)
      expect(pub.metadata).toEqual({ locale: 'en-US' })
    })

    it('preserves channel/status as typed enums', () => {
      const pub = toPublicSubscriber(row)
      expect(pub.channel).toBe('email')
      expect(pub.status).toBe('confirmed')
    })
  })
})
