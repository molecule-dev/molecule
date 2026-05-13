import { describe, expect, it } from 'vitest'

import { escapeXml, joinLines, toISODate, toRFC822, xmlElement, xmlSelfClosing } from '../xml.js'

describe('escapeXml', () => {
  it('escapes & to &amp;', () => {
    expect(escapeXml('Tom & Jerry')).toBe('Tom &amp; Jerry')
  })

  it('escapes < to &lt;', () => {
    expect(escapeXml('<script>')).toBe('&lt;script&gt;')
  })

  it('escapes > to &gt;', () => {
    expect(escapeXml('a > b')).toBe('a &gt; b')
  })

  it('escapes " to &quot;', () => {
    expect(escapeXml('say "hi"')).toBe('say &quot;hi&quot;')
  })

  it("escapes ' to &apos;", () => {
    expect(escapeXml("it's")).toBe('it&apos;s')
  })

  it('escapes the ampersand FIRST so subsequent &-prefixed entities are not double-escaped', () => {
    // & must be replaced before < / > / " / ', otherwise the & in the
    // entity references themselves would get re-escaped.
    expect(escapeXml('<foo>')).toBe('&lt;foo&gt;')
    expect(escapeXml('<foo>')).not.toContain('&amp;lt;')
  })

  it('passes plain text unchanged', () => {
    expect(escapeXml('plain text')).toBe('plain text')
  })

  it('escapes multiple special chars in one string', () => {
    expect(escapeXml('a <b> & "c" \'d\'')).toBe('a &lt;b&gt; &amp; &quot;c&quot; &apos;d&apos;')
  })

  it('handles empty string', () => {
    expect(escapeXml('')).toBe('')
  })
})

describe('xmlElement', () => {
  it('wraps content in opening + closing tags', () => {
    expect(xmlElement('title', 'Hello')).toBe('<title>Hello</title>')
  })

  it('returns empty string for undefined content', () => {
    expect(xmlElement('title', undefined)).toBe('')
  })

  it('returns empty string for empty-string content', () => {
    expect(xmlElement('title', '')).toBe('')
  })

  it('escapes XML special characters in content', () => {
    expect(xmlElement('p', 'Tom & Jerry')).toBe('<p>Tom &amp; Jerry</p>')
  })

  it('renders attributes when provided', () => {
    expect(xmlElement('a', 'click', { href: '/x' })).toBe('<a href="/x">click</a>')
  })

  it('escapes attribute values', () => {
    expect(xmlElement('a', 'click', { href: 'https://x.test?q="a&b"' })).toBe(
      '<a href="https://x.test?q=&quot;a&amp;b&quot;">click</a>',
    )
  })

  it('joins multiple attributes with spaces', () => {
    const out = xmlElement('a', 'click', { href: '/x', target: '_blank' })
    // attribute order isn't guaranteed by spec but Object.entries returns in
    // insertion order, so this is deterministic
    expect(out).toContain('href="/x"')
    expect(out).toContain('target="_blank"')
  })
})

describe('xmlSelfClosing', () => {
  it('renders a self-closing element with attributes', () => {
    expect(xmlSelfClosing('br', {})).toBe('<br />')
  })

  it('escapes attribute values', () => {
    expect(xmlSelfClosing('img', { src: 'a&b.png' })).toBe('<img src="a&amp;b.png"/>')
  })

  it('joins multiple attributes', () => {
    const out = xmlSelfClosing('link', { rel: 'self', href: '/feed' })
    expect(out).toContain('rel="self"')
    expect(out).toContain('href="/feed"')
    expect(out.endsWith('/>')).toBe(true)
  })
})

describe('toISODate', () => {
  it('serializes Date to ISO 8601', () => {
    const date = new Date('2026-05-13T10:00:00Z')
    expect(toISODate(date)).toBe('2026-05-13T10:00:00.000Z')
  })

  it('passes strings through unchanged', () => {
    expect(toISODate('2026-05-13')).toBe('2026-05-13')
  })

  it('passes invalid date strings through (caller responsibility)', () => {
    // Function does NOT parse-then-reformat string inputs; only Date
    // instances are serialised.
    expect(toISODate('not-a-date')).toBe('not-a-date')
  })
})

describe('toRFC822', () => {
  it('serializes Date to RFC 822 (UTC string)', () => {
    const date = new Date(Date.UTC(2026, 4, 13, 10, 0, 0))
    const out = toRFC822(date)
    // UTC string: "Wed, 13 May 2026 10:00:00 GMT"
    expect(out).toContain('13 May 2026')
    expect(out).toContain('10:00:00')
    expect(out.endsWith('GMT')).toBe(true)
  })

  it('parses string inputs into Dates before formatting', () => {
    const out = toRFC822('2026-05-13T10:00:00Z')
    expect(out).toContain('13 May 2026')
  })
})

describe('joinLines', () => {
  it('joins lines with newlines + indent prefix per level', () => {
    expect(joinLines(['<a/>', '<b/>'], '  ', 1)).toBe('  <a/>\n  <b/>')
  })

  it('multiplies indent by level', () => {
    expect(joinLines(['x'], '  ', 3)).toBe('      x')
  })

  it('level=0 emits no indentation', () => {
    expect(joinLines(['x', 'y'], '  ', 0)).toBe('x\ny')
  })

  it('filters out empty-string lines', () => {
    expect(joinLines(['a', '', 'b'], '  ', 0)).toBe('a\nb')
  })

  it('empty input → empty string', () => {
    expect(joinLines([], '  ', 1)).toBe('')
  })

  it('all-empty input → empty string (after filter)', () => {
    expect(joinLines(['', '', ''], '  ', 1)).toBe('')
  })

  it('uses tab indent when supplied', () => {
    expect(joinLines(['x'], '\t', 2)).toBe('\t\tx')
  })
})
