import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ProviderModule from '../provider.js'
import type { StreamingProvider } from '../types.js'

let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider
let hasProvider: typeof ProviderModule.hasProvider
let createStream: typeof ProviderModule.createStream
let transcode: typeof ProviderModule.transcode
let generateManifest: typeof ProviderModule.generateManifest
let getSegment: typeof ProviderModule.getSegment

const createMockProvider = (overrides?: Partial<StreamingProvider>): StreamingProvider => ({
  createStream: vi.fn().mockResolvedValue({
    id: 'stream-1',
    protocol: 'hls',
    manifestUri: '/streams/stream-1/index.m3u8',
    duration: 120,
    segments: [
      { index: 0, duration: 6, uri: '/streams/stream-1/seg-0.ts' },
      { index: 1, duration: 6, uri: '/streams/stream-1/seg-1.ts' },
    ],
  }),
  transcode: vi.fn().mockResolvedValue({
    id: 'transcode-1',
    masterManifestUri: '/streams/transcode-1/master.m3u8',
    variants: [
      {
        profile: '720p',
        uri: '/streams/transcode-1/720p.m3u8',
        width: 1280,
        height: 720,
        bitrate: 2_500_000,
      },
    ],
  }),
  generateManifest: vi.fn().mockReturnValue('#EXTM3U\n#EXT-X-VERSION:3'),
  getSegment: vi.fn().mockResolvedValue(Buffer.from('segment-data')),
  ...overrides,
})

describe('media streaming provider', () => {
  beforeEach(async () => {
    vi.resetModules()
    const providerModule = await import('../provider.js')
    setProvider = providerModule.setProvider
    getProvider = providerModule.getProvider
    hasProvider = providerModule.hasProvider
    createStream = providerModule.createStream
    transcode = providerModule.transcode
    generateManifest = providerModule.generateManifest
    getSegment = providerModule.getSegment
  })

  describe('provider management', () => {
    it('should throw when no provider is set', () => {
      expect(() => getProvider()).toThrow(
        'Media streaming provider not configured. Call setProvider() first.',
      )
    })

    it('should return false when no provider is configured', () => {
      expect(hasProvider()).toBe(false)
    })

    it('should set and get provider', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
    })

    it('should return true when provider is configured', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)
      expect(hasProvider()).toBe(true)
    })
  })

  describe('convenience functions', () => {
    let mockProvider: StreamingProvider

    beforeEach(() => {
      mockProvider = createMockProvider()
      setProvider(mockProvider)
    })

    it('should delegate createStream to provider', async () => {
      const options = { segmentDuration: 10, protocol: 'hls' as const }
      const manifest = await createStream('/path/to/video.mp4', options)
      expect(mockProvider.createStream).toHaveBeenCalledWith('/path/to/video.mp4', options)
      expect(manifest.id).toBe('stream-1')
      expect(manifest.segments).toHaveLength(2)
    })

    it('should delegate createStream with Buffer input', async () => {
      const buf = Buffer.from('video-data')
      await createStream(buf)
      expect(mockProvider.createStream).toHaveBeenCalledWith(buf, undefined)
    })

    it('should delegate transcode to provider', async () => {
      const profiles = [
        { name: '720p', width: 1280, height: 720, videoBitrate: 2_500_000, audioBitrate: 128_000 },
      ]
      const result = await transcode('/path/to/video.mp4', profiles)
      expect(mockProvider.transcode).toHaveBeenCalledWith('/path/to/video.mp4', profiles)
      expect(result.variants).toHaveLength(1)
    })

    it('should delegate generateManifest to provider', () => {
      const segments = [
        { index: 0, duration: 6, uri: '/seg-0.ts' },
        { index: 1, duration: 6, uri: '/seg-1.ts' },
      ]
      const options = { protocol: 'hls' as const }
      const manifest = generateManifest(segments, options)
      expect(mockProvider.generateManifest).toHaveBeenCalledWith(segments, options)
      expect(manifest).toContain('#EXTM3U')
    })

    it('should delegate getSegment to provider', async () => {
      const segment = await getSegment('stream-1', 0)
      expect(mockProvider.getSegment).toHaveBeenCalledWith('stream-1', 0)
      expect(Buffer.isBuffer(segment)).toBe(true)
    })
  })

  describe('error handling', () => {
    it('should throw on createStream when no provider is set', async () => {
      await expect(createStream('/path/to/video.mp4')).rejects.toThrow(
        'Media streaming provider not configured. Call setProvider() first.',
      )
    })

    it('should throw on transcode when no provider is set', async () => {
      await expect(
        transcode('/path/to/video.mp4', [
          {
            name: '720p',
            width: 1280,
            height: 720,
            videoBitrate: 2_500_000,
            audioBitrate: 128_000,
          },
        ]),
      ).rejects.toThrow('Media streaming provider not configured. Call setProvider() first.')
    })

    it('should throw on generateManifest when no provider is set', () => {
      expect(() => generateManifest([])).toThrow(
        'Media streaming provider not configured. Call setProvider() first.',
      )
    })

    it('should throw on getSegment when no provider is set', async () => {
      await expect(getSegment('stream-1', 0)).rejects.toThrow(
        'Media streaming provider not configured. Call setProvider() first.',
      )
    })
  })
})
