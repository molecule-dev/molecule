import { describe, expect, it } from 'vitest'

import { isRefusedMarkdownUrl, isSafeMarkdownUrl } from '../url.js'

describe('isSafeMarkdownUrl', () => {
  describe('schemes on the allow-list', () => {
    it('accepts http and https URLs', () => {
      expect(isSafeMarkdownUrl('http://example.com/a')).toBe(true)
      expect(isSafeMarkdownUrl('https://example.com/a?b=c')).toBe(true)
    })

    it('accepts mailto, tel, irc, ircs and xmpp URLs', () => {
      expect(isSafeMarkdownUrl('mailto:me@example.com')).toBe(true)
      expect(isSafeMarkdownUrl('tel:+15551234567')).toBe(true)
      expect(isSafeMarkdownUrl('irc://irc.example.com/#channel')).toBe(true)
      expect(isSafeMarkdownUrl('ircs://irc.example.com/#channel')).toBe(true)
      expect(isSafeMarkdownUrl('xmpp:me@example.com')).toBe(true)
    })

    it('matches the scheme case-insensitively', () => {
      expect(isSafeMarkdownUrl('HTTPS://example.com')).toBe(true)
      expect(isSafeMarkdownUrl('MailTo:me@example.com')).toBe(true)
    })
  })

  describe('relative URLs and fragments', () => {
    it('accepts root-, path- and parent-relative forms', () => {
      expect(isSafeMarkdownUrl('/a')).toBe(true)
      expect(isSafeMarkdownUrl('a/b')).toBe(true)
      expect(isSafeMarkdownUrl('../a')).toBe(true)
    })

    it('accepts a query string and a fragment', () => {
      expect(isSafeMarkdownUrl('?q=1')).toBe(true)
      expect(isSafeMarkdownUrl('#x')).toBe(true)
    })

    it('accepts the empty string as a relative URL', () => {
      expect(isSafeMarkdownUrl('')).toBe(true)
    })
  })

  describe('other schemes are refused', () => {
    it('refuses javascript, vbscript, data and file', () => {
      expect(isSafeMarkdownUrl('javascript:alert(1)')).toBe(false)
      expect(isSafeMarkdownUrl('vbscript:msgbox(1)')).toBe(false)
      expect(isSafeMarkdownUrl('data:text/html,hi')).toBe(false)
      expect(isSafeMarkdownUrl('file:///etc/passwd')).toBe(false)
    })

    it('refuses an unknown scheme', () => {
      expect(isSafeMarkdownUrl('myapp:do-something')).toBe(false)
    })
  })

  describe('obfuscated dangerous schemes are still refused', () => {
    it('ignores leading whitespace', () => {
      expect(isSafeMarkdownUrl(' javascript:alert(1)')).toBe(false)
    })

    it('ignores embedded whitespace and control characters in the scheme', () => {
      expect(isSafeMarkdownUrl('java\nscript:alert(1)')).toBe(false)
      expect(isSafeMarkdownUrl('java\tscript:alert(1)')).toBe(false)
      expect(isSafeMarkdownUrl('java\rscript:alert(1)')).toBe(false)
    })

    it('ignores mixed case', () => {
      expect(isSafeMarkdownUrl('JaVaScRiPt:alert(1)')).toBe(false)
    })
  })

  describe('encoding is not decoded', () => {
    it('treats a percent-encoded scheme as a relative path', () => {
      expect(isSafeMarkdownUrl('%6Aavascript:alert(1)')).toBe(true)
    })
  })
})

describe('isRefusedMarkdownUrl', () => {
  it('refuses what isSafeMarkdownUrl refuses when sanitize is on or unset', () => {
    for (const url of [
      'javascript:alert(1)',
      'data:image/png;base64,AAAA',
      'file:///etc/passwd',
      'ftp://x.com/a',
    ]) {
      expect(isRefusedMarkdownUrl(url)).toBe(true)
      expect(isRefusedMarkdownUrl(url, true)).toBe(true)
    }
    for (const url of ['https://x.com', '/docs/a', '#top', 'tel:+1']) {
      expect(isRefusedMarkdownUrl(url)).toBe(false)
    }
  })

  it('keeps every other scheme with sanitize off, but never a script scheme', () => {
    for (const url of [
      'ftp://x.com/a',
      'data:image/png;base64,AAAA',
      'file:///a',
      'https://x.com',
      '/a',
    ]) {
      expect(isRefusedMarkdownUrl(url, false)).toBe(false)
    }
    for (const url of [
      'javascript:alert(1)',
      'vbscript:msgbox(1)',
      'JaVaScRiPt:x',
      ' javascript:x',
      'java\nscript:x',
      'java\tscript:x',
      'vb\u0000script:x',
    ]) {
      expect(isRefusedMarkdownUrl(url, false)).toBe(true)
    }
  })
})
