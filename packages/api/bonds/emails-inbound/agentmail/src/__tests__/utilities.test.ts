/**
 * Unit tests for the AgentMail inbound provider's pure helpers.
 *
 * These cover the deterministic signing/parsing utilities; the
 * provider-level tests (provider.test.ts) exercise verification, parsing,
 * hydration and reply dispatch end to end with a mocked `fetch`.
 */

import { Buffer } from 'node:buffer'

import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  bodyToString,
  buildSignedContent,
  decodeWebhookSecret,
  getHeader,
  headerToString,
  isRecord,
  lowercaseHeaderMap,
  normalizeAddressList,
  parseJsonBody,
  parseRetryAfterSeconds,
  parseSignatureHeader,
  parseTimestamp,
  safeEqualBase64,
  unwrapMessageId,
} from '../utilities.js'

describe('headerToString', () => {
  it('passes through plain strings', () => {
    expect(headerToString('application/json')).toBe('application/json')
  })

  it('joins array values with `, `', () => {
    expect(headerToString(['a', 'b'])).toBe('a, b')
  })

  it('returns undefined for undefined input', () => {
    expect(headerToString(undefined)).toBeUndefined()
  })
})

describe('getHeader', () => {
  it('looks up headers case-insensitively', () => {
    expect(getHeader({ 'Svix-Signature': 'v1,abc' }, 'svix-signature')).toBe('v1,abc')
    expect(getHeader({ 'webhook-id': 'msg_1' }, 'Webhook-Id')).toBe('msg_1')
  })

  it('returns undefined when missing', () => {
    expect(getHeader({}, 'absent')).toBeUndefined()
  })
})

describe('bodyToString', () => {
  it('decodes Buffer as UTF-8', () => {
    expect(bodyToString(Buffer.from('héllo', 'utf8'))).toBe('héllo')
  })

  it('returns plain strings as-is', () => {
    expect(bodyToString('plain')).toBe('plain')
  })
})

describe('isRecord', () => {
  it('accepts plain objects only', () => {
    expect(isRecord({})).toBe(true)
    expect(isRecord({ a: 1 })).toBe(true)
    expect(isRecord([])).toBe(false)
    expect(isRecord(null)).toBe(false)
    expect(isRecord('x')).toBe(false)
  })
})

describe('parseJsonBody', () => {
  it('parses JSON strings', () => {
    expect(parseJsonBody('{"event_type":"message.received"}')).toEqual({
      event_type: 'message.received',
    })
  })

  it('parses Buffer bodies', () => {
    expect(parseJsonBody(Buffer.from('{"a":1}', 'utf8'))).toEqual({ a: 1 })
  })

  it('passes already-parsed objects through untouched', () => {
    const body = { event_type: 'message.received', message: {} }
    expect(parseJsonBody(body)).toBe(body)
  })

  it('throws on malformed JSON', () => {
    expect(() => parseJsonBody('not json')).toThrow(SyntaxError)
  })
})

describe('decodeWebhookSecret', () => {
  const keyBytes = Buffer.from('0123456789abcdef0123456789abcdef')

  it('strips the whsec_ prefix and base64-decodes the rest', () => {
    const secret = `whsec_${keyBytes.toString('base64')}`
    expect(decodeWebhookSecret(secret).equals(keyBytes)).toBe(true)
  })

  it('base64-decodes a secret that has no prefix', () => {
    expect(decodeWebhookSecret(keyBytes.toString('base64')).equals(keyBytes)).toBe(true)
  })

  it('tolerates surrounding whitespace from a .env line', () => {
    expect(decodeWebhookSecret(`  whsec_${keyBytes.toString('base64')}\n`).equals(keyBytes)).toBe(
      true,
    )
  })

  it('yields an empty key for an empty secret', () => {
    expect(decodeWebhookSecret('whsec_').length).toBe(0)
  })
})

describe('buildSignedContent', () => {
  it('concatenates id, timestamp and the body with dots', () => {
    const content = buildSignedContent('msg_1', '1700000000', '{"a":1}')
    expect(content.toString('utf8')).toBe('msg_1.1700000000.{"a":1}')
  })

  it('keeps Buffer bodies byte-exact (no UTF-8 round trip)', () => {
    const raw = Buffer.from([0x7b, 0xff, 0xfe, 0x7d]) // not valid UTF-8
    const content = buildSignedContent('id', '1', raw)
    expect(content.subarray(content.length - raw.length).equals(raw)).toBe(true)
  })
})

describe('parseSignatureHeader', () => {
  it('extracts a single v1 signature', () => {
    expect(parseSignatureHeader('v1,abc=')).toEqual(['abc='])
  })

  it('extracts every v1 signature from a space-delimited list (secret rotation)', () => {
    expect(parseSignatureHeader('v1,first v1,second')).toEqual(['first', 'second'])
  })

  it('ignores signatures of other versions and malformed entries', () => {
    expect(parseSignatureHeader('v2,other v1,ok ,broken nocomma v1,')).toEqual(['ok'])
  })

  it('returns an empty list for missing input', () => {
    expect(parseSignatureHeader(undefined)).toEqual([])
    expect(parseSignatureHeader('')).toEqual([])
  })
})

describe('safeEqualBase64', () => {
  const a = Buffer.from('same-bytes-here!').toString('base64')

  it('is true for equal digests', () => {
    expect(safeEqualBase64(a, a)).toBe(true)
  })

  it('is false for different digests of the same length', () => {
    const b = Buffer.from('same-bytes-here?').toString('base64')
    expect(safeEqualBase64(a, b)).toBe(false)
  })

  it('is false for different lengths and for empty input', () => {
    expect(safeEqualBase64(a, Buffer.from('short').toString('base64'))).toBe(false)
    expect(safeEqualBase64('', '')).toBe(false)
  })
})

describe('normalizeAddressList', () => {
  it('wraps a single string', () => {
    expect(normalizeAddressList(' alice@example.com ')).toEqual(['alice@example.com'])
  })

  it('keeps string arrays, trimming and dropping empties and non-strings', () => {
    expect(normalizeAddressList(['a@x', '', ' b@y ', 42, null])).toEqual(['a@x', 'b@y'])
  })

  it('returns an empty array for absent or malformed input', () => {
    expect(normalizeAddressList(undefined)).toEqual([])
    expect(normalizeAddressList({ not: 'an address' })).toEqual([])
  })
})

describe('lowercaseHeaderMap', () => {
  it('lowercases names and keeps string values', () => {
    expect(lowercaseHeaderMap({ From: 'a@x', 'X-Custom': 'one' })).toEqual({
      from: 'a@x',
      'x-custom': 'one',
    })
  })

  it('collects repeated names (differing only by case) into arrays', () => {
    expect(lowercaseHeaderMap({ Received: 'one', received: 'two' })).toEqual({
      received: ['one', 'two'],
    })
  })

  it('accepts array values and skips non-string leaves', () => {
    expect(lowercaseHeaderMap({ 'X-Multi': ['a', 'b', 3], 'X-Num': 7 })).toEqual({
      'x-multi': ['a', 'b'],
    })
  })

  it('returns an empty record when the map is missing or malformed', () => {
    expect(lowercaseHeaderMap(undefined)).toEqual({})
    expect(lowercaseHeaderMap('nope')).toEqual({})
  })
})

describe('unwrapMessageId', () => {
  it('strips angle brackets', () => {
    expect(unwrapMessageId('<abc@x>')).toBe('abc@x')
  })

  it('passes plain message-ids through', () => {
    expect(unwrapMessageId('abc@x')).toBe('abc@x')
  })

  it('returns undefined for empty, missing or non-string input', () => {
    expect(unwrapMessageId(undefined)).toBeUndefined()
    expect(unwrapMessageId('')).toBeUndefined()
    expect(unwrapMessageId('   ')).toBeUndefined()
    expect(unwrapMessageId(12)).toBeUndefined()
  })
})

describe('parseTimestamp', () => {
  it('parses ISO 8601', () => {
    expect(parseTimestamp('2026-09-01T10:00:00Z')).toEqual(new Date('2026-09-01T10:00:00Z'))
  })

  it('returns undefined for invalid or missing input', () => {
    expect(parseTimestamp('yesterday-ish')).toBeUndefined()
    expect(parseTimestamp('')).toBeUndefined()
    expect(parseTimestamp(undefined)).toBeUndefined()
  })
})

describe('parseRetryAfterSeconds', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('parses delta-seconds', () => {
    expect(parseRetryAfterSeconds('30')).toBe(30)
    expect(parseRetryAfterSeconds(' 7 ')).toBe(7)
  })

  it('parses an HTTP-date relative to now, never negative', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-01T10:00:00Z'))
    expect(parseRetryAfterSeconds('Tue, 01 Sep 2026 10:00:45 GMT')).toBe(45)
    expect(parseRetryAfterSeconds('Tue, 01 Sep 2026 09:00:00 GMT')).toBe(0)
  })

  it('returns undefined for missing or unparseable values', () => {
    expect(parseRetryAfterSeconds(null)).toBeUndefined()
    expect(parseRetryAfterSeconds(undefined)).toBeUndefined()
    expect(parseRetryAfterSeconds('soon')).toBeUndefined()
  })
})
