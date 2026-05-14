import { describe, expect, it } from 'vitest'

import { escapeXml, formatItunesDuration, formatRfc822, wrapCdata } from '../utilities.js'

describe('escapeXml', () => {
  it('returns empty string for null', () => {
    expect(escapeXml(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(escapeXml(undefined)).toBe('')
  })

  it('returns empty string for empty input', () => {
    expect(escapeXml('')).toBe('')
  })

  it('returns plain text unchanged', () => {
    expect(escapeXml('hello world')).toBe('hello world')
  })

  it('escapes ampersand first to avoid double-encoding', () => {
    expect(escapeXml('Tom & Jerry')).toBe('Tom &amp; Jerry')
    expect(escapeXml('a&b&c')).toBe('a&amp;b&amp;c')
  })

  it('escapes < and >', () => {
    expect(escapeXml('<script>')).toBe('&lt;script&gt;')
  })

  it('escapes double quote', () => {
    expect(escapeXml('she said "hi"')).toBe('she said &quot;hi&quot;')
  })

  it('escapes single quote (apostrophe)', () => {
    expect(escapeXml("it's")).toBe('it&apos;s')
  })

  it('escapes a mix of characters in a single pass', () => {
    expect(escapeXml('<a href="x?y=1&z=2">Link\'s here</a>')).toBe(
      '&lt;a href=&quot;x?y=1&amp;z=2&quot;&gt;Link&apos;s here&lt;/a&gt;',
    )
  })

  it('coerces non-string values via String()', () => {
    expect(escapeXml(42 as unknown as string)).toBe('42')
  })
})

describe('wrapCdata', () => {
  it('returns empty CDATA section for null', () => {
    expect(wrapCdata(null)).toBe('<![CDATA[]]>')
  })

  it('returns empty CDATA section for undefined', () => {
    expect(wrapCdata(undefined)).toBe('<![CDATA[]]>')
  })

  it('wraps plain text in CDATA', () => {
    expect(wrapCdata('hello')).toBe('<![CDATA[hello]]>')
  })

  it('preserves HTML markup verbatim inside CDATA (no escaping)', () => {
    expect(wrapCdata('<p>Hi & bye</p>')).toBe('<![CDATA[<p>Hi & bye</p>]]>')
  })

  it('neutralizes ]]> sequences by splitting across two CDATA blocks', () => {
    expect(wrapCdata('hello]]>world')).toBe('<![CDATA[hello]]]]><![CDATA[>world]]>')
  })

  it('handles multiple ]]> sequences', () => {
    expect(wrapCdata('a]]>b]]>c')).toBe('<![CDATA[a]]]]><![CDATA[>b]]]]><![CDATA[>c]]>')
  })
})

describe('formatItunesDuration', () => {
  it('formats sub-minute durations as MM:SS', () => {
    expect(formatItunesDuration(0)).toBe('00:00')
    expect(formatItunesDuration(45)).toBe('00:45')
  })

  it('formats minute durations as MM:SS', () => {
    expect(formatItunesDuration(60)).toBe('01:00')
    expect(formatItunesDuration(125)).toBe('02:05')
  })

  it('switches to HH:MM:SS at or above 1 hour', () => {
    expect(formatItunesDuration(3600)).toBe('01:00:00')
    expect(formatItunesDuration(3661)).toBe('01:01:01')
    expect(formatItunesDuration(7325)).toBe('02:02:05')
  })

  it('zero-pads single-digit hours, minutes, and seconds', () => {
    expect(formatItunesDuration(3 * 3600 + 5 * 60 + 7)).toBe('03:05:07')
  })

  it('rounds fractional seconds down', () => {
    expect(formatItunesDuration(45.9)).toBe('00:45')
    expect(formatItunesDuration(125.5)).toBe('02:05')
  })

  it('throws RangeError on negative input', () => {
    expect(() => formatItunesDuration(-1)).toThrowError(RangeError)
  })

  it('throws RangeError on Infinity', () => {
    expect(() => formatItunesDuration(Infinity)).toThrowError(RangeError)
  })

  it('throws RangeError on NaN', () => {
    expect(() => formatItunesDuration(NaN)).toThrowError(RangeError)
  })
})

describe('formatRfc822', () => {
  it('formats a Date instance as an RFC 822 GMT string', () => {
    const out = formatRfc822(new Date('2026-05-14T12:34:56Z'))
    expect(out).toBe('Thu, 14 May 2026 12:34:56 GMT')
  })

  it('parses an ISO string', () => {
    expect(formatRfc822('2026-01-01T00:00:00Z')).toBe('Thu, 01 Jan 2026 00:00:00 GMT')
  })

  it('throws RangeError on an unparseable string', () => {
    expect(() => formatRfc822('not-a-date')).toThrowError(RangeError)
  })

  it('throws RangeError on Date(NaN)', () => {
    expect(() => formatRfc822(new Date(NaN))).toThrowError(RangeError)
  })
})
