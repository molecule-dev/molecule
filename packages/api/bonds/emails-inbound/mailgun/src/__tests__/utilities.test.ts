/**
 * Unit tests for the Mailgun inbound provider's parsing utilities.
 *
 * These cover the deterministic, pure helpers; the provider-level tests
 * (provider.test.ts) exercise signing, parsing, and reply dispatch end to
 * end with mocked transports.
 */

import { Buffer } from 'node:buffer'

import { describe, expect, it } from 'vitest'

import {
  bodyToString,
  getHeader,
  headerToString,
  parseFormBody,
  parseMailgunMessageHeaders,
  splitAddressList,
  splitReferences,
  unwrapMessageId,
} from '../utilities.js'

describe('headerToString', () => {
  it('passes through plain strings', () => {
    expect(headerToString('text/plain')).toBe('text/plain')
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
    expect(getHeader({ 'Content-Type': 'text/html' }, 'content-type')).toBe('text/html')
    expect(getHeader({ 'X-Mailgun-Variables': 'foo' }, 'x-mailgun-variables')).toBe('foo')
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

describe('parseFormBody', () => {
  it('parses URL-encoded strings', () => {
    const out = parseFormBody('From=alice%40example.com&Subject=hi&body-plain=hello')
    expect(out.From).toBe('alice@example.com')
    expect(out.Subject).toBe('hi')
    expect(out['body-plain']).toBe('hello')
  })

  it('parses Buffer bodies', () => {
    const buf = Buffer.from('From=bob%40example.com&Subject=test', 'utf8')
    expect(parseFormBody(buf).From).toBe('bob@example.com')
  })

  it('coerces pre-parsed objects to string values', () => {
    const out = parseFormBody({ From: 'x@y', count: 3, ignored: null })
    expect(out.From).toBe('x@y')
    expect(out.count).toBe('3')
    expect(out).not.toHaveProperty('ignored')
  })

  it('keeps the first occurrence of duplicated keys', () => {
    const out = parseFormBody('From=a&From=b')
    expect(out.From).toBe('a')
  })
})

describe('splitAddressList', () => {
  it('splits a simple comma-separated list', () => {
    expect(splitAddressList('a@x, b@y')).toEqual(['a@x', 'b@y'])
  })

  it('respects display names with embedded commas in quotes', () => {
    expect(splitAddressList('"Bob, Jr." <b@y>, alice@x')).toEqual(['"Bob, Jr." <b@y>', 'alice@x'])
  })

  it('respects angle-bracketed addresses', () => {
    expect(splitAddressList('Alice <a@x>, Bob <b@y>')).toEqual(['Alice <a@x>', 'Bob <b@y>'])
  })

  it('returns an empty array for undefined / empty input', () => {
    expect(splitAddressList(undefined)).toEqual([])
    expect(splitAddressList('')).toEqual([])
    expect(splitAddressList('   ')).toEqual([])
  })
})

describe('splitReferences', () => {
  it('splits whitespace-separated message-ids', () => {
    expect(splitReferences('<a@x> <b@x>\n<c@x>')).toEqual(['<a@x>', '<b@x>', '<c@x>'])
  })

  it('returns empty array for missing input', () => {
    expect(splitReferences(undefined)).toEqual([])
    expect(splitReferences('')).toEqual([])
  })
})

describe('parseMailgunMessageHeaders', () => {
  it('parses Mailgun-style JSON tuple arrays', () => {
    const raw = JSON.stringify([
      ['Received', 'by mx.example'],
      ['From', 'alice@example.com'],
      ['X-Custom', 'one'],
      ['X-Custom', 'two'],
    ])
    const out = parseMailgunMessageHeaders(raw)
    expect(out.received).toBe('by mx.example')
    expect(out.from).toBe('alice@example.com')
    expect(out['x-custom']).toEqual(['one', 'two'])
  })

  it('returns empty record on invalid JSON', () => {
    expect(parseMailgunMessageHeaders('not json')).toEqual({})
  })

  it('returns empty record when input is undefined', () => {
    expect(parseMailgunMessageHeaders(undefined)).toEqual({})
  })

  it('skips entries that are not [string, string] tuples', () => {
    const raw = JSON.stringify([['only-name'], [42, 'value'], ['ok', 'value']])
    expect(parseMailgunMessageHeaders(raw)).toEqual({ ok: 'value' })
  })
})

describe('unwrapMessageId', () => {
  it('strips angle brackets', () => {
    expect(unwrapMessageId('<abc@x>')).toBe('abc@x')
  })

  it('passes plain message-ids through', () => {
    expect(unwrapMessageId('abc@x')).toBe('abc@x')
  })

  it('returns undefined for empty / missing input', () => {
    expect(unwrapMessageId(undefined)).toBeUndefined()
    expect(unwrapMessageId('')).toBeUndefined()
    expect(unwrapMessageId('   ')).toBeUndefined()
  })
})
