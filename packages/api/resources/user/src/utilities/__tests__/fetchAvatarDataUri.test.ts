import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockLookup = vi.fn()
vi.mock('node:dns/promises', () => ({
  lookup: (host: string, options: unknown) => mockLookup(host, options),
}))

vi.mock('@molecule/api-bond', () => ({
  getLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

const { fetchAvatarDataUri } = await import('../fetchAvatarDataUri.js')

/** A minimal ok image response for the stubbed fetch. */
const imageResponse = (
  bytes: Uint8Array,
  overrides: { contentType?: string; url?: string; ok?: boolean; contentLength?: string } = {},
): Response =>
  ({
    ok: overrides.ok ?? true,
    url: overrides.url ?? 'https://avatars.example.com/photo.png',
    headers: new Headers({
      'content-type': overrides.contentType ?? 'image/png',
      ...(overrides.contentLength ? { 'content-length': overrides.contentLength } : {}),
    }),
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length),
  }) as unknown as Response

const mockFetch = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch)
  mockLookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }])
  mockFetch.mockResolvedValue(imageResponse(new Uint8Array([1, 2, 3])))
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('fetchAvatarDataUri', () => {
  it('inlines a public https image as a data URI', async () => {
    const result = await fetchAvatarDataUri('https://avatars.example.com/photo.png')
    expect(result).toBe(`data:image/png;base64,${Buffer.from([1, 2, 3]).toString('base64')}`)
  })

  it('refuses plain-http URLs', async () => {
    expect(await fetchAvatarDataUri('http://avatars.example.com/photo.png')).toBeUndefined()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('refuses localhost, internal-suffix names, and private IP literals', async () => {
    for (const url of [
      'https://localhost/x.png',
      'https://foo.internal/x.png',
      'https://printer.local/x.png',
      'https://10.0.0.5/x.png',
      'https://[::1]/x.png',
    ]) {
      expect(await fetchAvatarDataUri(url)).toBeUndefined()
    }
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('refuses hosts that resolve to a private address (SSRF guard)', async () => {
    mockLookup.mockResolvedValue([
      { address: '93.184.216.34', family: 4 },
      { address: '192.168.1.10', family: 4 },
    ])
    expect(await fetchAvatarDataUri('https://rebind.example.com/x.png')).toBeUndefined()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('refuses a redirect that lands on an unsafe URL', async () => {
    mockFetch.mockResolvedValue(
      imageResponse(new Uint8Array([1]), { url: 'http://internal.example.com/x.png' }),
    )
    expect(await fetchAvatarDataUri('https://avatars.example.com/photo.png')).toBeUndefined()
  })

  it('refuses non-image content types', async () => {
    mockFetch.mockResolvedValue(
      imageResponse(new Uint8Array([1]), { contentType: 'text/html; charset=utf-8' }),
    )
    expect(await fetchAvatarDataUri('https://avatars.example.com/photo.png')).toBeUndefined()
  })

  it('refuses oversized bodies (declared and actual)', async () => {
    mockFetch.mockResolvedValue(
      imageResponse(new Uint8Array([1]), { contentLength: String(10 * 1024 * 1024) }),
    )
    expect(await fetchAvatarDataUri('https://avatars.example.com/photo.png')).toBeUndefined()

    mockFetch.mockResolvedValue(imageResponse(new Uint8Array(300 * 1024)))
    expect(await fetchAvatarDataUri('https://avatars.example.com/photo.png')).toBeUndefined()
  })

  it('returns undefined instead of throwing when the fetch fails', async () => {
    mockFetch.mockRejectedValue(new Error('network down'))
    expect(await fetchAvatarDataUri('https://avatars.example.com/photo.png')).toBeUndefined()
  })

  it('normalizes the mime from the content type (jpeg with parameters)', async () => {
    mockFetch.mockResolvedValue(
      imageResponse(new Uint8Array([9]), { contentType: 'image/JPEG; charset=binary' }),
    )
    const result = await fetchAvatarDataUri('https://avatars.example.com/photo.jpg')
    expect(result).toMatch(/^data:image\/jpeg;base64,/)
  })
})
