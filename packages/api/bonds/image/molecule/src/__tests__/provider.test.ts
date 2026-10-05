import { afterEach, describe, expect, it, vi } from 'vitest'

import { createProvider, IMAGE_SERVICE_LIMITS } from '../provider.js'

function stubFetch(status: number, body: unknown): ReturnType<typeof vi.fn> {
  const fn = vi
    .fn()
    .mockImplementation(() =>
      Promise.resolve(
        new Response(typeof body === 'string' ? body : JSON.stringify(body), { status }),
      ),
    )
  vi.stubGlobal('fetch', fn)
  return fn
}

afterEach(() => {
  vi.unstubAllGlobals()
})

const IMG = Buffer.from('fake-image-bytes')
const RESULT = {
  data: 'dHJhbnNmb3JtZWQ=',
  mimeType: 'image/webp',
  width: 10,
  height: 10,
  format: 'webp',
  bytes: 12,
}

describe('api-image-molecule', () => {
  it('posts a one-op pipeline and decodes the returned image', async () => {
    const fetchMock = stubFetch(200, RESULT)
    const out = await createProvider({
      apiKey: 'mk_test',
      servicesUrl: 'http://localhost:1/api/v1/services',
    }).thumbnail(IMG, 64)
    expect(out.toString()).toBe('transformed')
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://localhost:1/api/v1/services/image/transform')
    expect(JSON.parse(String(init.body))).toEqual({
      image: IMG.toString('base64'),
      ops: [{ op: 'thumbnail', size: 64 }],
    })
  })

  it('maps every core method to its op shape', async () => {
    const fetchMock = stubFetch(200, RESULT)
    const p = createProvider({ apiKey: 'mk_test' })
    await p.resize(IMG, { width: 10, height: 10, fit: 'cover' })
    await p.crop(IMG, { left: 1, top: 2, width: 3, height: 4 })
    await p.convert(IMG, 'webp', 80)
    await p.optimize(IMG, { quality: 70 })
    await p.rotate(IMG, { angle: 90 })
    await p.flip(IMG)
    await p.flop(IMG)
    const ops = fetchMock.mock.calls.map(
      (c) => JSON.parse(String((c[1] as RequestInit).body)).ops[0],
    )
    expect(ops).toEqual([
      { op: 'resize', width: 10, height: 10, fit: 'cover' },
      { op: 'crop', left: 1, top: 2, width: 3, height: 4 },
      { op: 'convert', format: 'webp', quality: 80 },
      { op: 'optimize', quality: 70 },
      { op: 'rotate', angle: 90 },
      { op: 'flip' },
      { op: 'flop' },
    ])
  })

  it('refuses oversized images and empty pipelines locally, before any request', async () => {
    const fetchMock = stubFetch(200, RESULT)
    const p = createProvider({ apiKey: 'mk_test' })
    await expect(
      p.flip(Buffer.alloc(IMAGE_SERVICE_LIMITS.maxImageBytes + 1)),
    ).rejects.toMatchObject({ status: 413 })
    await expect(p.flip(Buffer.alloc(0))).rejects.toMatchObject({
      status: 400,
      errorKey: 'hostedServices.error.invalidInput',
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('refuses getMetadata (metadata rides every transform response)', async () => {
    stubFetch(200, RESULT)
    await expect(createProvider({ apiKey: 'mk_test' }).getMetadata(IMG)).rejects.toMatchObject({
      status: 400,
    })
  })

  it('throws MoleculeServiceError without a key, before any request', async () => {
    const fetchMock = stubFetch(200, RESULT)
    const old = process.env.MOLECULE_API_KEY
    delete process.env.MOLECULE_API_KEY
    try {
      await expect(
        createProvider({ servicesUrl: 'http://localhost:1/api/v1/services' }).flip(IMG),
      ).rejects.toMatchObject({ status: 401 })
    } finally {
      if (old !== undefined) process.env.MOLECULE_API_KEY = old
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('refuses a public cleartext services URL', () => {
    expect(() =>
      createProvider({ apiKey: 'mk_test', servicesUrl: 'http://example.com/api/v1/services' }),
    ).toThrow(/must use https/)
  })
})
