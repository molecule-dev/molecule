/**
 * Unit tests for the {@link createFeedHandler} factory.
 */

import { describe, expect, it, vi } from 'vitest'

import { createFeedHandler } from '../handler.js'
import type { Feed } from '../types.js'

const sampleFeed: Feed = {
  title: 'Sample',
  link: 'https://example.com/',
  description: 'Sample feed',
  items: [{ id: 'a', title: 'a' }],
}

describe('createFeedHandler', () => {
  it('returns 404 for unknown extensions', async () => {
    const handle = createFeedHandler({ loadFeed: () => sampleFeed })
    const res = await handle({ extension: 'xml' })
    expect(res.status).toBe(404)
  })

  it('serves RSS at extension=rss with the right content type', async () => {
    const handle = createFeedHandler({ loadFeed: () => sampleFeed })
    const res = await handle({ extension: 'rss' })
    expect(res.status).toBe(200)
    expect(res.headers['Content-Type']).toBe('application/rss+xml; charset=utf-8')
    expect(res.body).toContain('<rss version="2.0"')
  })

  it('serves Atom at extension=atom with the right content type', async () => {
    const handle = createFeedHandler({ loadFeed: () => sampleFeed })
    const res = await handle({ extension: 'atom' })
    expect(res.status).toBe(200)
    expect(res.headers['Content-Type']).toBe('application/atom+xml; charset=utf-8')
    expect(res.body).toContain('<feed xmlns="http://www.w3.org/2005/Atom"')
  })

  it('serves JSON Feed at extension=json with the right content type', async () => {
    const handle = createFeedHandler({ loadFeed: () => sampleFeed })
    const res = await handle({ extension: 'json' })
    expect(res.status).toBe(200)
    expect(res.headers['Content-Type']).toBe('application/feed+json; charset=utf-8')
    const json = JSON.parse(res.body) as Record<string, unknown>
    expect(json.version).toBe('https://jsonfeed.org/version/1.1')
  })

  it('caches and returns 304 on matching ETag', async () => {
    const loadFeed = vi.fn(() => sampleFeed)
    const handle = createFeedHandler({ loadFeed, cacheTtlMs: 60_000 })

    const first = await handle({ extension: 'rss' })
    expect(first.status).toBe(200)
    const etag = first.headers.ETag
    expect(etag).toBeTruthy()

    const second = await handle({ extension: 'rss', ifNoneMatch: etag })
    expect(second.status).toBe(304)
    expect(second.body).toBe('')
    expect(loadFeed).toHaveBeenCalledTimes(1) // cache hit, no reload
  })

  it('honors cacheTtlMs=0 by reloading every request', async () => {
    const loadFeed = vi.fn(() => sampleFeed)
    const handle = createFeedHandler({ loadFeed, cacheTtlMs: 0 })

    await handle({ extension: 'rss' })
    await handle({ extension: 'rss' })
    expect(loadFeed).toHaveBeenCalledTimes(2)
  })

  it('returns 503 when loadFeed throws', async () => {
    const onError = vi.fn()
    const handle = createFeedHandler({
      loadFeed: () => {
        throw new Error('db down')
      },
      onError,
    })
    const res = await handle({ extension: 'rss' })
    expect(res.status).toBe(503)
    expect(onError).toHaveBeenCalledOnce()
  })

  it('supports custom extension keys', async () => {
    const handle = createFeedHandler({
      loadFeed: () => sampleFeed,
      extensions: { feed: 'rss-2.0' },
    })
    const res = await handle({ extension: 'feed' })
    expect(res.status).toBe(200)
    expect(res.headers['Content-Type']).toBe('application/rss+xml; charset=utf-8')
  })

  it('loadFeed may be sync or async', async () => {
    const handle = createFeedHandler({
      loadFeed: async () => sampleFeed,
    })
    const res = await handle({ extension: 'json' })
    expect(res.status).toBe(200)
  })

  it('200 response includes Cache-Control with max-age', async () => {
    const handle = createFeedHandler({ loadFeed: () => sampleFeed, cacheTtlMs: 60_000 })
    const res = await handle({ extension: 'rss' })
    expect(res.headers['Cache-Control']).toBe('public, max-age=60')
  })

  it('200 response with TTL=0 advertises no-store', async () => {
    const handle = createFeedHandler({ loadFeed: () => sampleFeed, cacheTtlMs: 0 })
    const res = await handle({ extension: 'rss' })
    expect(res.headers['Cache-Control']).toBe('no-store')
  })
})
