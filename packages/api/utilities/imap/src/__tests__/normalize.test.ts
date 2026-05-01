/**
 * Unit tests for the pure normalization helpers.
 */

import { describe, expect, it } from 'vitest'

import {
  detectHasAttachments,
  normalizeAddresses,
  normalizeDate,
  normalizeEnvelope,
  normalizeFlags,
  normalizeFolder,
  normalizeSubject,
} from '../normalize.js'

describe('normalizeAddresses', () => {
  it('returns [] for undefined', () => {
    expect(normalizeAddresses(undefined)).toEqual([])
  })

  it('drops entries without an address', () => {
    expect(
      normalizeAddresses([
        { name: 'No Address' },
        { address: 'real@example.com' },
        { name: 'Jane', address: 'jane@example.com' },
      ]),
    ).toEqual([{ address: 'real@example.com' }, { name: 'Jane', address: 'jane@example.com' }])
  })

  it('omits empty `name` field rather than emitting an undefined property', () => {
    const [first] = normalizeAddresses([{ address: 'no-name@example.com' }])
    expect(first).toEqual({ address: 'no-name@example.com' })
    expect('name' in first).toBe(false)
  })
})

describe('normalizeDate', () => {
  it('returns the original Date when it is valid', () => {
    const date = new Date('2026-05-01T12:00:00Z')
    expect(normalizeDate(date)).toBe(date)
  })

  it('parses string dates', () => {
    expect(normalizeDate('2026-05-01T12:00:00Z').toISOString()).toBe('2026-05-01T12:00:00.000Z')
  })

  it('falls back to epoch on invalid input', () => {
    expect(normalizeDate(undefined).getTime()).toBe(0)
    expect(normalizeDate('not a date').getTime()).toBe(0)
    expect(normalizeDate(new Date('garbage')).getTime()).toBe(0)
  })
})

describe('normalizeFlags', () => {
  it('returns [] for undefined', () => {
    expect(normalizeFlags(undefined)).toEqual([])
  })

  it('preserves backslash-prefixed flag names from a Set', () => {
    expect(normalizeFlags(new Set(['\\Seen', '\\Flagged']))).toEqual(['\\Seen', '\\Flagged'])
  })

  it('passes arrays through as a fresh copy (no aliasing)', () => {
    const input = ['\\Seen']
    const out = normalizeFlags(input)
    expect(out).toEqual(['\\Seen'])
    expect(out).not.toBe(input)
  })
})

describe('normalizeSubject', () => {
  it('returns "" when missing', () => {
    expect(normalizeSubject(undefined)).toBe('')
  })

  it('trims whitespace', () => {
    expect(normalizeSubject('  hello  ')).toBe('hello')
  })
})

describe('normalizeFolder', () => {
  it('derives `name` from the trailing path segment when missing', () => {
    expect(
      normalizeFolder({ path: 'INBOX/Travel/2026', delimiter: '/', subscribed: true }),
    ).toEqual({
      path: 'INBOX/Travel/2026',
      name: '2026',
      delimiter: '/',
      subscribed: true,
    })
  })

  it('passes specialUse through and defaults delimiter to "/"', () => {
    expect(normalizeFolder({ path: 'Sent', specialUse: '\\Sent' })).toEqual({
      path: 'Sent',
      name: 'Sent',
      delimiter: '/',
      subscribed: false,
      specialUse: '\\Sent',
    })
  })
})

describe('detectHasAttachments', () => {
  it('returns false for undefined', () => {
    expect(detectHasAttachments(undefined)).toBe(false)
  })

  it('returns true when a child node has disposition=attachment', () => {
    expect(
      detectHasAttachments({
        type: 'multipart/mixed',
        childNodes: [
          { type: 'text/plain' },
          {
            type: 'application/pdf',
            disposition: 'attachment',
            dispositionParameters: { filename: 'a.pdf' },
          },
        ],
      }),
    ).toBe(true)
  })

  it('returns true for a top-level filename without a disposition', () => {
    expect(
      detectHasAttachments({
        type: 'application/pdf',
        parameters: { name: 'spec.pdf' },
      }),
    ).toBe(true)
  })

  it('returns false for inline images (filename + disposition=inline)', () => {
    expect(
      detectHasAttachments({
        type: 'multipart/related',
        childNodes: [
          {
            type: 'image/png',
            disposition: 'inline',
            dispositionParameters: { filename: 'avatar.png' },
          },
        ],
      }),
    ).toBe(false)
  })

  it('returns false for purely text+html alternatives', () => {
    expect(
      detectHasAttachments({
        type: 'multipart/alternative',
        childNodes: [{ type: 'text/plain' }, { type: 'text/html' }],
      }),
    ).toBe(false)
  })
})

describe('normalizeEnvelope', () => {
  it('handles a fully-populated envelope', () => {
    const env = normalizeEnvelope({
      from: [{ name: 'Jane Doe', address: 'jane@example.com' }],
      to: [{ address: 'me@example.com' }],
      cc: [{ name: 'CC', address: 'cc@example.com' }],
      subject: 'Hi',
      date: new Date('2026-05-01T00:00:00Z'),
    })
    expect(env.from).toEqual([{ name: 'Jane Doe', address: 'jane@example.com' }])
    expect(env.to).toEqual([{ address: 'me@example.com' }])
    expect(env.cc).toEqual([{ name: 'CC', address: 'cc@example.com' }])
    expect(env.subject).toBe('Hi')
    expect(env.date.toISOString()).toBe('2026-05-01T00:00:00.000Z')
  })

  it('returns sane defaults for an empty envelope', () => {
    const env = normalizeEnvelope(undefined)
    expect(env.from).toEqual([])
    expect(env.to).toEqual([])
    expect(env.cc).toEqual([])
    expect(env.subject).toBe('')
    expect(env.date.getTime()).toBe(0)
  })
})
