import { beforeEach, describe, expect, it } from 'vitest'

import type { DeployTargetRequest, StaticSiteManifest } from '@molecule/api-deploy-target'

import { contentTypeFor } from '../content-types.js'
import { createS3DeployTarget, invalidSitePath } from '../provider.js'
import type { S3SendClient } from '../types.js'

/** An in-memory S3 that records what was sent, for the commands the target uses. */
class FakeS3 implements S3SendClient {
  objects = new Map<
    string,
    { body: Uint8Array | string; contentType?: string; cacheControl?: string }
  >()
  sent: string[] = []
  failPutOn: string | null = null
  pageSize = 1000

  async send(command: unknown): Promise<unknown> {
    const name = (command as { constructor: { name: string } }).constructor.name
    const input = (command as { input: Record<string, unknown> }).input
    this.sent.push(name)
    if (name === 'PutObjectCommand') {
      const key = input.Key as string
      if (this.failPutOn && key.endsWith(this.failPutOn)) throw new Error('put failed')
      this.objects.set(key, {
        body: input.Body as Uint8Array | string,
        contentType: input.ContentType as string,
        cacheControl: input.CacheControl as string,
      })
      return {}
    }
    if (name === 'ListObjectsV2Command') {
      const prefix = input.Prefix as string
      const all = [...this.objects.keys()].filter((k) => k.startsWith(prefix)).sort()
      const start = input.ContinuationToken ? Number(input.ContinuationToken) : 0
      const page = all.slice(start, start + this.pageSize)
      const more = start + this.pageSize < all.length
      return {
        Contents: page.map((key) => ({ Key: key })),
        IsTruncated: more,
        NextContinuationToken: more ? String(start + this.pageSize) : undefined,
      }
    }
    if (name === 'DeleteObjectsCommand') {
      const del = input.Delete as { Objects: Array<{ Key: string }> }
      for (const { Key } of del.Objects) this.objects.delete(Key)
      return {}
    }
    throw new Error(`unexpected command ${name}`)
  }
}

const enc = (s: string): Uint8Array => new TextEncoder().encode(s)

const request = (overrides: Partial<DeployTargetRequest> = {}): DeployTargetRequest => ({
  siteId: 'proj-1',
  releaseId: 'r1',
  files: [
    { path: '/index.html', body: enc('<h1>home</h1>') },
    { path: '/about/index.html', body: enc('<h1>about</h1>') },
    { path: '/assets/app-3f2a.js', body: enc('console.log(1)') },
    { path: '/rss.xml', body: enc('<rss/>') },
  ],
  routing: { basePath: '/blog/', unmatchedPaths: 'not-found' },
  ...overrides,
})

describe('createS3DeployTarget', () => {
  let s3: FakeS3
  beforeEach(() => {
    s3 = new FakeS3()
  })

  const target = (): ReturnType<typeof createS3DeployTarget> =>
    createS3DeployTarget({
      bucket: 'sites-bucket',
      publicBaseUrl: 'https://sites-bucket.fly.storage.tigris.dev/',
      client: s3,
    })

  it('publishes every file under the release prefix, then the manifest last', async () => {
    const release = await target().deploy(request())

    expect(release).toMatchObject({
      target: 's3',
      siteId: 'proj-1',
      releaseId: 'r1',
      url: null,
      fileCount: 4,
      routing: { basePath: '/blog', unmatchedPaths: 'not-found' },
    })
    expect(release.origin).toEqual({
      kind: 'static-files',
      filesBaseUrl: 'https://sites-bucket.fly.storage.tigris.dev/sites/proj-1/r1/files/',
      manifestUrl: 'https://sites-bucket.fly.storage.tigris.dev/sites/proj-1/r1/manifest.json',
    })
    expect([...s3.objects.keys()].sort()).toEqual([
      'sites/proj-1/r1/files/about/index.html',
      'sites/proj-1/r1/files/assets/app-3f2a.js',
      'sites/proj-1/r1/files/index.html',
      'sites/proj-1/r1/files/rss.xml',
      'sites/proj-1/r1/manifest.json',
    ])
    // The manifest is the LAST write: a release whose manifest exists is complete.
    const puts = s3.sent.filter((n) => n === 'PutObjectCommand')
    expect(puts).toHaveLength(5)
    const html = s3.objects.get('sites/proj-1/r1/files/index.html')
    expect(html?.contentType).toBe('text/html; charset=utf-8')
    expect(html?.cacheControl).toContain('immutable')

    const manifest = JSON.parse(
      s3.objects.get('sites/proj-1/r1/manifest.json')!.body as string,
    ) as StaticSiteManifest
    expect(manifest.format).toBe('molecule-static-site/1')
    expect(manifest.routing).toEqual({ basePath: '/blog', unmatchedPaths: 'not-found' })
    expect(Object.keys(manifest.files).sort()).toEqual([
      '/about/index.html',
      '/assets/app-3f2a.js',
      '/index.html',
      '/rss.xml',
    ])
    expect(manifest.files['/rss.xml']).toMatchObject({ contentType: 'application/xml', size: 6 })
    expect(manifest.files['/index.html'].etag).toMatch(/^[0-9a-f]{32}$/)
  })

  it('percent-encodes each key segment in the public URLs', async () => {
    const release = await target().deploy(request({ siteId: 'p_1', releaseId: 'r-2' }))
    expect(release.origin).toMatchObject({
      manifestUrl: 'https://sites-bucket.fly.storage.tigris.dev/sites/p_1/r-2/manifest.json',
    })
  })

  it('refuses a release without /index.html, bad paths, duplicates and bad ids — before any write', async () => {
    const bad: Array<[Partial<DeployTargetRequest>, RegExp]> = [
      [{ files: [{ path: '/a.html', body: enc('x') }] }, /no \/index\.html/],
      [{ files: [] }, /needs the build output/],
      [{ files: undefined }, /needs the build output/],
      [
        {
          files: [
            { path: '/index.html', body: enc('x') },
            { path: '/../x', body: enc('x') },
          ],
        },
        /Invalid file path/,
      ],
      [
        {
          files: [
            { path: '/index.html', body: enc('x') },
            { path: '/index.html', body: enc('y') },
          ],
        },
        /listed twice/,
      ],
      [{ siteId: '../other' }, /Invalid siteId/],
      [{ releaseId: 'a/b' }, /Invalid releaseId/],
      [{ routing: { basePath: 'blog', unmatchedPaths: 'not-found' } }, /Invalid basePath/],
    ]
    for (const [overrides, message] of bad) {
      await expect(target().deploy(request(overrides))).rejects.toThrow(message)
    }
    expect(s3.objects.size).toBe(0)
  })

  it('a failed upload removes what this release wrote — and never an earlier release', async () => {
    await target().deploy(request({ releaseId: 'r0' }))
    const before = [...s3.objects.keys()].filter((k) => k.startsWith('sites/proj-1/r0/'))
    s3.failPutOn = 'rss.xml'
    await expect(target().deploy(request({ releaseId: 'r1' }))).rejects.toThrow('put failed')
    expect([...s3.objects.keys()].filter((k) => k.startsWith('sites/proj-1/r1/'))).toEqual([])
    expect([...s3.objects.keys()].filter((k) => k.startsWith('sites/proj-1/r0/'))).toEqual(before)
  })

  it('cancellation stops the deploy with code "cancelled" and cleans up', async () => {
    const error = await target()
      .deploy(request({ isCancelled: () => true }))
      .catch((e: unknown) => e)
    expect((error as { code?: string }).code).toBe('cancelled')
    expect(s3.objects.size).toBe(0)
  })

  it('remove() deletes the whole site, or keeps the named releases', async () => {
    s3.pageSize = 2 // exercise pagination
    await target().deploy(request({ releaseId: 'r1' }))
    await target().deploy(request({ releaseId: 'r2' }))
    await target().deploy(request({ siteId: 'other', releaseId: 'r1' }))

    await target().remove('proj-1', { keepReleaseIds: ['r2'] })
    const keys = [...s3.objects.keys()]
    expect(keys.some((k) => k.startsWith('sites/proj-1/r1/'))).toBe(false)
    expect(keys.filter((k) => k.startsWith('sites/proj-1/r2/'))).toHaveLength(5)

    await target().remove('proj-1')
    expect([...s3.objects.keys()].every((k) => k.startsWith('sites/other/'))).toBe(true)
    // Idempotent: nothing left is not an error.
    await target().remove('proj-1')
  })

  it('remove() throws when the store reports undeleted keys', async () => {
    await target().deploy(request())
    const failing: S3SendClient = {
      send: async (command: unknown) => {
        const name = (command as { constructor: { name: string } }).constructor.name
        if (name === 'DeleteObjectsCommand') {
          return { Errors: [{ Key: 'x', Code: 'AccessDenied', Message: 'no' }] }
        }
        return s3.send(command)
      },
    }
    await expect(
      createS3DeployTarget({ bucket: 'b', publicBaseUrl: 'https://b', client: failing }).remove(
        'proj-1',
      ),
    ).rejects.toThrow(/Could not delete/)
  })

  it('requires bucket and publicBaseUrl', () => {
    expect(() => createS3DeployTarget({ bucket: '', publicBaseUrl: 'https://x' })).toThrow(/bucket/)
    expect(() => createS3DeployTarget({ bucket: 'b', publicBaseUrl: '' })).toThrow(/publicBaseUrl/)
  })
})

describe('invalidSitePath', () => {
  it('accepts site-relative file paths and refuses everything else', () => {
    expect(invalidSitePath('/index.html')).toBeNull()
    expect(invalidSitePath('/blog/post one/index.html')).toBeNull()
    for (const p of ['index.html', '/a/', '/a//b', '/./a', '/a/../b', '/a\\b', '/a\u0000b']) {
      expect(invalidSitePath(p)).not.toBeNull()
    }
  })
})

describe('contentTypeFor', () => {
  it('prefers the given type, then the extension, then octet-stream', () => {
    expect(contentTypeFor('/x.bin', 'application/custom')).toBe('application/custom')
    expect(contentTypeFor('/a/B.CSS')).toBe('text/css; charset=utf-8')
    expect(contentTypeFor('/feed.xml')).toBe('application/xml')
    expect(contentTypeFor('/LICENSE')).toBe('application/octet-stream')
    expect(contentTypeFor('/.htaccess')).toBe('application/octet-stream')
  })
})
