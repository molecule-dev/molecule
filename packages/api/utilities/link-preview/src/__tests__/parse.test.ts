import { describe, expect, it } from 'vitest'

import { parseHtml, resolveUrl } from '../parse.js'

describe('parseHtml', () => {
  it('extracts a full Open Graph card', () => {
    const html = `
      <html>
        <head>
          <title>Plain Title</title>
          <meta property="og:title" content="OG Title">
          <meta property="og:description" content="OG description &amp; more">
          <meta property="og:image" content="https://cdn.example.com/img.png">
          <meta property="og:site_name" content="Example Co">
          <meta property="og:type" content="article">
          <meta property="og:url" content="https://example.com/canonical">
        </head>
        <body>ignored</body>
      </html>
    `
    const out = parseHtml(html, 'https://example.com/article')
    expect(out.title).toBe('OG Title')
    expect(out.description).toBe('OG description & more')
    expect(out.image).toBe('https://cdn.example.com/img.png')
    expect(out.siteName).toBe('Example Co')
    expect(out.type).toBe('article')
    expect(out.url).toBe('https://example.com/article')
  })

  it('falls back to Twitter Card when OG is absent', () => {
    const html = `
      <head>
        <title>Doc Title</title>
        <meta name="twitter:title" content="Twitter Title">
        <meta name="twitter:description" content="Twitter desc">
        <meta name="twitter:image" content="/relative/twitter.jpg">
        <meta name="description" content="meta desc">
      </head>
    `
    const out = parseHtml(html, 'https://example.com/foo')
    expect(out.title).toBe('Twitter Title')
    expect(out.description).toBe('Twitter desc')
    expect(out.image).toBe('https://example.com/relative/twitter.jpg')
    // siteName falls back to hostname when og:site_name absent
    expect(out.siteName).toBe('example.com')
    expect(out.type).toBe('website')
  })

  it('falls back to <title> + meta description when OG and Twitter are missing', () => {
    const html = `
      <head>
        <title>  Plain Title  </title>
        <meta name="description" content="The plain description.">
      </head>
    `
    const out = parseHtml(html, 'https://example.com/x')
    expect(out.title).toBe('Plain Title')
    expect(out.description).toBe('The plain description.')
    expect(out.image).toBeUndefined()
  })

  it('detects oEmbed discovery link', () => {
    const html = `
      <head>
        <title>x</title>
        <link rel="alternate" type="application/json+oembed"
              href="/oembed?url=foo">
      </head>
    `
    const out = parseHtml(html, 'https://media.example.com/video/123')
    expect(out.oembedUrl).toBe('https://media.example.com/oembed?url=foo')
  })

  it('returns graceful nulls for missing fields', () => {
    const html = `<html><head></head><body>nothing here</body></html>`
    const out = parseHtml(html, 'https://example.com/empty')
    expect(out.title).toBeUndefined()
    expect(out.description).toBeUndefined()
    expect(out.image).toBeUndefined()
    expect(out.url).toBe('https://example.com/empty')
    expect(out.type).toBe('website')
    expect(out.oembedUrl).toBeUndefined()
    // siteName still falls back to hostname
    expect(out.siteName).toBe('example.com')
  })

  it('handles attribute order swap (content first, then property)', () => {
    const html = `
      <head>
        <meta content="Reversed Order Title" property="og:title">
      </head>
    `
    const out = parseHtml(html, 'https://example.com/r')
    expect(out.title).toBe('Reversed Order Title')
  })

  it('decodes numeric and named HTML entities', () => {
    const html = `
      <head>
        <meta property="og:title" content="Caf&#233; &amp; Tea &#x2014; menu">
      </head>
    `
    const out = parseHtml(html, 'https://example.com/x')
    expect(out.title).toBe('Café & Tea — menu')
  })

  it('prefers og:image over og:image:url and twitter:image', () => {
    const html = `
      <head>
        <meta property="og:image" content="https://a.example.com/og.png">
        <meta property="og:image:url" content="https://b.example.com/og2.png">
        <meta name="twitter:image" content="https://c.example.com/tw.png">
      </head>
    `
    const out = parseHtml(html, 'https://example.com/')
    expect(out.image).toBe('https://a.example.com/og.png')
  })
})

describe('resolveUrl', () => {
  it('resolves relative URLs against the base', () => {
    expect(resolveUrl('/foo/bar', 'https://example.com/page')).toBe('https://example.com/foo/bar')
  })

  it('passes absolute URLs through', () => {
    expect(resolveUrl('https://other.example.com/x', 'https://example.com/page')).toBe(
      'https://other.example.com/x',
    )
  })

  it('returns undefined for unparseable URLs', () => {
    expect(resolveUrl('http://[invalid', 'https://example.com/')).toBeUndefined()
  })

  it('returns undefined when input is undefined', () => {
    expect(resolveUrl(undefined, 'https://example.com/')).toBeUndefined()
  })
})
