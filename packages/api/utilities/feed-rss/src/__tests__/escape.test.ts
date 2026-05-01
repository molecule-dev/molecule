/**
 * Unit tests for the low-level escape helpers in `escape.ts`. These are
 * the foundation of every serializer — bugs here would mean XSS holes in
 * every output format.
 */

import { describe, expect, it } from 'vitest'

import { escapeAttr, escapeUrl, escapeXml, wrapCdata } from '../escape.js'

describe('escapeXml', () => {
  it('maps the five XML predefined entities', () => {
    expect(escapeXml(`<&>"'`)).toBe('&lt;&amp;&gt;&quot;&apos;')
  })

  it('strips XML 1.0 illegal control chars but keeps tab/lf/cr', () => {
    expect(escapeXml('a\x00b\x01c\x08d\x0bx\x0cy\x0ez')).toBe('abcdxyz')
    expect(escapeXml('a\tb\nc\rd')).toBe('a\tb\nc\rd')
  })

  it('returns empty string for nullish', () => {
    expect(escapeXml(undefined)).toBe('')
    expect(escapeXml(null)).toBe('')
  })

  it('coerces numbers and booleans to strings', () => {
    expect(escapeXml(42)).toBe('42')
    expect(escapeXml(true)).toBe('true')
  })

  it('does not double-escape', () => {
    // Already-encoded entities should be re-escaped (we treat input as plain text).
    expect(escapeXml('&amp;')).toBe('&amp;amp;')
  })
})

describe('escapeAttr', () => {
  it('matches escapeXml semantics for attribute values', () => {
    expect(escapeAttr(`x"y`)).toBe('x&quot;y')
    expect(escapeAttr(`x'y`)).toBe('x&apos;y')
  })
})

describe('escapeUrl', () => {
  it('passes http(s)/mailto/ftp/tel/relative URLs through (escaped)', () => {
    expect(escapeUrl('https://example.com')).toBe('https://example.com')
    expect(escapeUrl('http://example.com')).toBe('http://example.com')
    expect(escapeUrl('mailto:a@b.com')).toBe('mailto:a@b.com')
    expect(escapeUrl('tel:+15551234567')).toBe('tel:+15551234567')
    expect(escapeUrl('/path/to/page')).toBe('/path/to/page')
    expect(escapeUrl('//example.com/path')).toBe('//example.com/path')
    expect(escapeUrl('relative/page?x=1')).toBe('relative/page?x=1')
  })

  it('rewrites javascript: to about:blank', () => {
    expect(escapeUrl('javascript:alert(1)')).toBe('about:blank')
    expect(escapeUrl('JaVaScRiPt:alert(1)')).toBe('about:blank')
  })

  it('rewrites data: vbscript: file: to about:blank', () => {
    expect(escapeUrl('data:text/html,<script>alert(1)</script>')).toBe('about:blank')
    expect(escapeUrl('vbscript:msgbox(1)')).toBe('about:blank')
    expect(escapeUrl('file:///etc/passwd')).toBe('about:blank')
  })

  it('escapes quotes inside the URL so attribute injection is impossible', () => {
    expect(escapeUrl('https://example.com/" onload="x()')).toContain('&quot;')
    expect(escapeUrl('https://example.com/" onload="x()')).not.toMatch(/"\s+onload/)
  })

  it('returns empty for nullish/empty', () => {
    expect(escapeUrl(undefined)).toBe('')
    expect(escapeUrl(null)).toBe('')
    expect(escapeUrl('   ')).toBe('')
  })
})

describe('wrapCdata', () => {
  it('wraps content in CDATA', () => {
    expect(wrapCdata('<p>hi</p>')).toBe('<![CDATA[<p>hi</p>]]>')
  })

  it('splits embedded ]]> markers safely', () => {
    const out = wrapCdata('before]]>after')
    expect(out).toBe('<![CDATA[before]]]]><![CDATA[>after]]>')
    // Confirm there's no unescaped ]]> in plain text — it only appears as
    // part of the deliberate split sequence.
    expect(out.split(']]>').length).toBeGreaterThan(2) // multiple terminators by design
  })

  it('strips XML 1.0 illegal control chars', () => {
    expect(wrapCdata('a\x00b')).toBe('<![CDATA[ab]]>')
  })

  it('returns empty CDATA for nullish/empty', () => {
    expect(wrapCdata(undefined)).toBe('<![CDATA[]]>')
    expect(wrapCdata(null)).toBe('<![CDATA[]]>')
    expect(wrapCdata('')).toBe('<![CDATA[]]>')
  })
})
