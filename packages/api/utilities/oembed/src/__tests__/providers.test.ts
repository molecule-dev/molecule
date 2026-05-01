import { describe, expect, it } from 'vitest'

import { buildProviderEndpoint, builtinProviders, findProvider } from '../providers.js'

describe('findProvider', () => {
  it('matches youtube.com/watch URLs', () => {
    const p = findProvider('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(p?.name).toBe('YouTube')
    expect(p?.endpoint).toContain('youtube.com/oembed')
  })

  it('matches youtu.be short URLs', () => {
    const p = findProvider('https://youtu.be/dQw4w9WgXcQ')
    expect(p?.name).toBe('YouTube')
  })

  it('matches twitter.com and x.com status URLs', () => {
    expect(findProvider('https://twitter.com/jack/status/20')?.name).toBe('Twitter')
    expect(findProvider('https://x.com/elonmusk/status/123')?.name).toBe('Twitter')
  })

  it('matches vimeo, soundcloud, spotify, codepen', () => {
    expect(findProvider('https://vimeo.com/12345')?.name).toBe('Vimeo')
    expect(findProvider('https://soundcloud.com/artist/track')?.name).toBe('SoundCloud')
    expect(findProvider('https://open.spotify.com/track/abc123')?.name).toBe('Spotify')
    expect(findProvider('https://codepen.io/user/pen/abcdef')?.name).toBe('CodePen')
  })

  it('returns undefined for unknown providers', () => {
    expect(findProvider('https://example.com/random/article')).toBeUndefined()
  })

  it('lets caller-supplied providers override built-ins', () => {
    const custom = {
      name: 'CustomYouTube',
      match: /^https?:\/\/(?:www\.)?youtube\.com\//i,
      endpoint: 'https://example.test/yt-oembed',
    }
    const p = findProvider('https://www.youtube.com/watch?v=abc', [custom])
    expect(p?.name).toBe('CustomYouTube')
    expect(p?.endpoint).toBe('https://example.test/yt-oembed')
  })

  it('exposes a non-empty built-in registry', () => {
    expect(builtinProviders.length).toBeGreaterThan(5)
  })
})

describe('buildProviderEndpoint', () => {
  it('appends url query parameter', () => {
    const p = builtinProviders.find((x) => x.name === 'YouTube')!
    const out = buildProviderEndpoint(p, 'https://youtu.be/abc')
    expect(out).toContain('format=json')
    expect(out).toContain('url=https%3A%2F%2Fyoutu.be%2Fabc')
  })

  it('appends maxwidth/maxheight when provided', () => {
    const p = builtinProviders.find((x) => x.name === 'Spotify')!
    const out = buildProviderEndpoint(p, 'https://open.spotify.com/track/x', 640, 480)
    expect(out).toContain('maxwidth=640')
    expect(out).toContain('maxheight=480')
  })

  it('uses ? when endpoint has no query, & otherwise', () => {
    const noQuery = { name: 'X', match: /./, endpoint: 'https://e.test/oe' }
    const withQuery = { name: 'X', match: /./, endpoint: 'https://e.test/oe?v=2' }
    expect(buildProviderEndpoint(noQuery, 'https://x.test/')).toContain('/oe?url=')
    expect(buildProviderEndpoint(withQuery, 'https://x.test/')).toContain('?v=2&url=')
  })
})
