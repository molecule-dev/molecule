import { describe, expect, it, vi } from 'vitest'

import { extractReadable, WEB_CONTENT_LIMITS } from '../extract.js'
import { createProvider, FETCH_LIMITS } from '../provider.js'

const ARTICLE = `<!doctype html>
<html><head><title>Deep work in practice</title>
<meta name="description" content="How to actually focus."></head>
<body>
<nav><a href="/home">Home</a><a href="/about">About</a></nav>
<article>
<h1>Deep work in practice</h1>
<p>The first rule is <a href="/rules">simple rules</a>, applied <b>daily</b>.</p>
<h2>Blocks</h2>
<table><tr><th>Day</th><th>Hours</th></tr><tr><td>Mon</td><td>4</td></tr></table>
<a href="https://example.org/ref">an external ref</a>
<a href="mailto:me@example.com">mail</a>
<a href="javascript:void(0)">click</a>
</article>
<script>window.__evil = true</script>
</body></html>`

describe('extractReadable', () => {
  it('isolates the article as markdown with title, description and absolute links', () => {
    const out = extractReadable(ARTICLE, {
      baseUrl: 'https://blog.example.com/posts/1',
      includeLinks: true,
    })
    expect(out.title).toBe('Deep work in practice')
    expect(out.description).toBe('How to actually focus.')
    expect(out.format).toBe('markdown')
    // Readability lifts the article's h1 into `title`, so the content starts
    // at the body: the paragraph, its links (absolute), and the emphasis.
    expect(out.content).toContain('[simple rules](https://blog.example.com/rules)')
    expect(out.content).toContain('**daily**')
    expect(out.truncated).toBe(false)
    expect(out.links).toBeDefined()
    // Relative links resolve against the base URL; non-http(s) drop; dedupe by URL.
    const urls = out.links?.map((l) => l.url) ?? []
    expect(urls).toContain('https://blog.example.com/rules')
    expect(urls).toContain('https://example.org/ref')
    expect(urls).not.toContain('mailto:me@example.com')
    expect(urls.some((u) => u.startsWith('javascript:'))).toBe(false)
  })

  it('renders GFM tables in markdown mode', () => {
    const out = extractReadable(ARTICLE, { baseUrl: 'https://blog.example.com/' })
    expect(out.content).toMatch(/\|/)
  })

  it('returns plain text in text format', () => {
    const out = extractReadable(ARTICLE, { baseUrl: 'https://blog.example.com/', format: 'text' })
    expect(out.format).toBe('text')
    // The h1 rides in `title`; the text body is squeezed prose, no markdown.
    expect(out.title).toBe('Deep work in practice')
    expect(out.content).toContain('The first rule is simple rules, applied daily')
    expect(out.content).not.toContain('#')
    expect(out.content).not.toMatch(/\*\*/)
  })

  it('falls back to the whole document text when nothing is an article', () => {
    const shell =
      '<html><head><title>App</title></head><body><div id="root"></div><noscript>enable JS</noscript></body></html>'
    const out = extractReadable(shell, { baseUrl: 'https://app.example.com/' })
    expect(out.content).toContain('enable JS')
  })

  it('collects at most the link cap, deduped', () => {
    const many = Array.from(
      { length: WEB_CONTENT_LIMITS.maxLinks + 20 },
      (_, i) => `<a href="https://e.example.com/${i}">l${i}</a>`,
    ).join('')
    const out = extractReadable(`<body>${many}</body>`, {
      baseUrl: 'https://e.example.com/',
      includeLinks: true,
    })
    expect(out.links?.length).toBe(WEB_CONTENT_LIMITS.maxLinks)
    expect(new Set(out.links?.map((l) => l.url)).size).toBe(WEB_CONTENT_LIMITS.maxLinks)
  })

  it('truncates content at the cap and flags it', () => {
    const long = `<html><body><p>${'word '.repeat(1000)}</p></body></html>`
    const out = extractReadable(long, { baseUrl: 'https://e.example.com/', maxContentChars: 50 })
    expect(out.truncated).toBe(true)
    expect(out.content.length).toBe(50)
  })
})

describe('readability provider', () => {
  it('refuses browser mode, both-given, bad url and bad baseUrl before any work', async () => {
    const p = createProvider()
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    try {
      await expect(p.fetch({ url: 'https://e.example.com/' }, { mode: 'browser' })).rejects.toThrow(
        'needs a browser engine',
      )
      await expect(p.fetch({ url: 'https://e.example.com/', html: '<p>x</p>' })).rejects.toThrow(
        'exactly one',
      )
      await expect(p.fetch({ url: 'file:///etc/passwd' })).rejects.toThrow('http(s) URL')
      await expect(p.fetch({ url: 'not a url' })).rejects.toThrow('http(s) URL')
      await expect(p.extract({ html: '<p>x</p>', baseUrl: 'nope' })).rejects.toThrow('http(s) URL')
      expect(fetchSpy).not.toHaveBeenCalled()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('fetches a page and returns the readable result with fetch metadata', async () => {
    const p = createProvider()
    const html = Buffer.from(ARTICLE)
    const response = new Response(html, {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    })
    // Rewrite the URL the way a redirect-following fetch reports it.
    Object.defineProperty(response, 'url', { value: 'https://blog.example.com/posts/1' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))
    try {
      const out = await p.fetch(
        { url: 'https://blog.example.com/posts/1' },
        {
          includeLinks: true,
        },
      )
      expect(out.statusCode).toBe(200)
      expect(out.finalUrl).toBe('https://blog.example.com/posts/1')
      expect(out.contentType).toContain('text/html')
      expect(out.title).toBe('Deep work in practice')
      expect(out.bytes).toBe(html.byteLength)
      expect(out.links?.length).toBeGreaterThan(0)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('refuses a body past the byte cap', async () => {
    const p = createProvider({ maxFetchBytes: 8 })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(new Uint8Array(64).fill(97), {
          status: 200,
          headers: { 'content-type': 'text/html' },
        }),
      ),
    )
    try {
      await expect(p.fetch({ url: 'https://e.example.com/big' })).rejects.toThrow(/over .* MB/)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('extract never touches the network', async () => {
    const p = createProvider()
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    try {
      const out = await p.extract({ html: '<h1>Hi</h1><p>Body</p>' })
      expect(out.content).toContain('Hi')
      expect(out.statusCode).toBeUndefined()
      expect(fetchSpy).not.toHaveBeenCalled()
      expect(out.bytes).toBe(Buffer.byteLength('<h1>Hi</h1><p>Body</p>', 'utf8'))
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('keeps the documented bound constants honest', () => {
    expect(FETCH_LIMITS.maxUrlChars).toBe(2048)
    expect(WEB_CONTENT_LIMITS.maxContentChars).toBe(500_000)
    expect(WEB_CONTENT_LIMITS.maxLinks).toBe(200)
  })
})
