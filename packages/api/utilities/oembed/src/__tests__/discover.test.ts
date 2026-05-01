import { describe, expect, it } from 'vitest'

import { discoverOembedUrl } from '../discover.js'

describe('discoverOembedUrl', () => {
  it('returns the absolute href for a JSON oEmbed link', () => {
    const html = `<head>
      <link rel="alternate" type="application/json+oembed"
            href="https://media.example.com/oembed?url=foo">
    </head>`
    expect(discoverOembedUrl(html, 'https://media.example.com/v/1')).toBe(
      'https://media.example.com/oembed?url=foo',
    )
  })

  it('resolves relative href against the page URL', () => {
    const html = `<head>
      <link rel="alternate" type="application/json+oembed" href="/oembed.json?id=1">
    </head>`
    expect(discoverOembedUrl(html, 'https://media.example.com/v/123')).toBe(
      'https://media.example.com/oembed.json?id=1',
    )
  })

  it('decodes &amp; entities in href', () => {
    const html = `<head>
      <link rel="alternate" type="application/json+oembed"
            href="https://e.test/oe?a=1&amp;b=2">
    </head>`
    expect(discoverOembedUrl(html, 'https://e.test/p')).toBe('https://e.test/oe?a=1&b=2')
  })

  it('ignores XML oEmbed links', () => {
    const html = `<head>
      <link rel="alternate" type="text/xml+oembed" href="https://e.test/oe.xml">
    </head>`
    expect(discoverOembedUrl(html, 'https://e.test/p')).toBeUndefined()
  })

  it('returns undefined when no oEmbed link present', () => {
    const html = `<head><title>x</title></head>`
    expect(discoverOembedUrl(html, 'https://e.test/p')).toBeUndefined()
  })
})
