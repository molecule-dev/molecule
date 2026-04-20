import { mkdir, readFile, writeFile } from 'node:fs/promises'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { StreamingProvider } from '@molecule/api-media-streaming'

// Mock node:child_process
vi.mock('node:child_process', () => ({
  execFile: vi.fn((_cmd: string, _args: string[], callback: (err: Error | null) => void) => {
    callback(null)
  }),
}))

// Mock node:fs/promises
vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  readdir: vi.fn().mockResolvedValue(['seg-000.ts', 'seg-001.ts', 'seg-002.ts', 'index.m3u8']),
  readFile: vi.fn().mockResolvedValue(Buffer.from('mock-segment-data')),
  writeFile: vi.fn().mockResolvedValue(undefined),
}))

describe('HLS streaming provider', () => {
  let createProvider: (config?: Record<string, unknown>) => StreamingProvider
  let provider: StreamingProvider

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('../provider.js')
    createProvider = mod.createProvider
    provider = mod.provider
  })

  describe('createProvider', () => {
    it('should create a provider with default config', () => {
      const p = createProvider()
      expect(p).toBeDefined()
      expect(p.createStream).toBeInstanceOf(Function)
      expect(p.transcode).toBeInstanceOf(Function)
      expect(p.generateManifest).toBeInstanceOf(Function)
      expect(p.getSegment).toBeInstanceOf(Function)
    })

    it('should create a provider with custom config', () => {
      const p = createProvider({
        ffmpegPath: '/usr/local/bin/ffmpeg',
        outputBasePath: '/tmp/streams',
        segmentDuration: 10,
        hlsVersion: 7,
      })
      expect(p).toBeDefined()
    })
  })

  describe('createStream', () => {
    it('should create a stream from a file path', async () => {
      const p = createProvider({ outputBasePath: '/tmp/test-streams' })
      const manifest = await p.createStream('/path/to/video.mp4')

      expect(manifest.id).toMatch(/^hls-/)
      expect(manifest.protocol).toBe('hls')
      expect(manifest.manifestUri).toContain('/index.m3u8')
      expect(manifest.segments).toHaveLength(3)
      expect(manifest.segments[0]!.index).toBe(0)
      expect(manifest.segments[0]!.uri).toContain('seg-000.ts')
      expect(mkdir).toHaveBeenCalled()
    })

    it('should create a stream from a Buffer', async () => {
      const p = createProvider({ outputBasePath: '/tmp/test-streams' })
      const buf = Buffer.from('video-data')
      const manifest = await p.createStream(buf)

      expect(manifest.id).toMatch(/^hls-/)
      expect(manifest.protocol).toBe('hls')
      expect(writeFile).toHaveBeenCalled()
    })

    it('should use custom segment duration', async () => {
      const p = createProvider({ outputBasePath: '/tmp/test-streams' })
      const manifest = await p.createStream('/path/to/video.mp4', {
        segmentDuration: 10,
      })

      expect(manifest.segments).toHaveLength(3)
    })

    it('should use custom output path', async () => {
      const p = createProvider({ outputBasePath: '/tmp/test-streams' })
      await p.createStream('/path/to/video.mp4', {
        outputPath: '/custom/output',
      })

      expect(mkdir).toHaveBeenCalledWith(expect.stringContaining('/custom/output/'), {
        recursive: true,
      })
    })
  })

  describe('transcode', () => {
    it('should transcode into multiple variants', async () => {
      const p = createProvider({ outputBasePath: '/tmp/test-streams' })
      const profiles = [
        {
          name: '720p',
          width: 1280,
          height: 720,
          videoBitrate: 2_500_000,
          audioBitrate: 128_000,
        },
        {
          name: '1080p',
          width: 1920,
          height: 1080,
          videoBitrate: 5_000_000,
          audioBitrate: 192_000,
        },
      ]

      const result = await p.transcode('/path/to/video.mp4', profiles)

      expect(result.id).toMatch(/^hls-/)
      expect(result.masterManifestUri).toContain('/master.m3u8')
      expect(result.variants).toHaveLength(2)
      expect(result.variants[0]!.profile).toBe('720p')
      expect(result.variants[0]!.width).toBe(1280)
      expect(result.variants[0]!.height).toBe(720)
      expect(result.variants[1]!.profile).toBe('1080p')
      expect(writeFile).toHaveBeenCalled()
    })

    it('should write master playlist to disk', async () => {
      const p = createProvider({ outputBasePath: '/tmp/test-streams' })
      await p.transcode('/path/to/video.mp4', [
        {
          name: '480p',
          width: 854,
          height: 480,
          videoBitrate: 1_000_000,
          audioBitrate: 96_000,
        },
      ])

      // writeFile is called for master playlist
      const writeFileMock = vi.mocked(writeFile)
      const masterCall = writeFileMock.mock.calls.find(
        (call) => typeof call[0] === 'string' && (call[0] as string).includes('master.m3u8'),
      )
      expect(masterCall).toBeDefined()
    })
  })

  describe('generateManifest', () => {
    it('should generate an M3U8 manifest from segments', () => {
      const p = createProvider()
      const segments = [
        { index: 0, duration: 6.0, uri: '/seg-000.ts' },
        { index: 1, duration: 6.0, uri: '/seg-001.ts' },
        { index: 2, duration: 4.5, uri: '/seg-002.ts' },
      ]

      const manifest = p.generateManifest(segments)

      expect(manifest).toContain('#EXTM3U')
      expect(manifest).toContain('#EXT-X-VERSION:3')
      expect(manifest).toContain('#EXTINF:6.000000,')
      expect(manifest).toContain('/seg-000.ts')
      expect(manifest).toContain('#EXT-X-ENDLIST')
    })

    it('should use config segment duration as target duration', () => {
      const p = createProvider({ segmentDuration: 10 })
      const segments = [{ index: 0, duration: 6.0, uri: '/seg-0.ts' }]

      const manifest = p.generateManifest(segments)

      expect(manifest).toContain('#EXT-X-TARGETDURATION:10')
    })

    it('should override target duration via options', () => {
      const p = createProvider({ segmentDuration: 10 })
      const segments = [{ index: 0, duration: 6.0, uri: '/seg-0.ts' }]

      const manifest = p.generateManifest(segments, { segmentDuration: 8 })

      expect(manifest).toContain('#EXT-X-TARGETDURATION:8')
    })
  })

  describe('getSegment', () => {
    it('should retrieve a segment from disk when not in memory', async () => {
      const p = createProvider({ outputBasePath: '/tmp/test-streams' })
      const segment = await p.getSegment('stream-1', 0)

      expect(readFile).toHaveBeenCalledWith(expect.stringContaining('seg-000.ts'))
      expect(Buffer.isBuffer(segment)).toBe(true)
    })
  })

  describe('default provider export', () => {
    it('should expose all StreamingProvider methods', () => {
      expect(provider.createStream).toBeInstanceOf(Function)
      expect(provider.transcode).toBeInstanceOf(Function)
      expect(provider.generateManifest).toBeInstanceOf(Function)
      expect(provider.getSegment).toBeInstanceOf(Function)
    })
  })
})
