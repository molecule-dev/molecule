import { describe, expect, it } from 'vitest'

import type { StreamSegment, TranscodeVariant } from '@molecule/api-media-streaming'

import { generateMasterPlaylist, generateMediaPlaylist } from '../m3u8.js'

describe('M3U8 generation', () => {
  describe('generateMediaPlaylist', () => {
    it('should generate a valid M3U8 media playlist', () => {
      const segments: StreamSegment[] = [
        { index: 0, duration: 6.0, uri: '/stream-1/seg-000.ts' },
        { index: 1, duration: 6.0, uri: '/stream-1/seg-001.ts' },
        { index: 2, duration: 4.5, uri: '/stream-1/seg-002.ts' },
      ]

      const result = generateMediaPlaylist(segments)

      expect(result).toContain('#EXTM3U')
      expect(result).toContain('#EXT-X-VERSION:3')
      expect(result).toContain('#EXT-X-TARGETDURATION:6')
      expect(result).toContain('#EXT-X-MEDIA-SEQUENCE:0')
      expect(result).toContain('#EXT-X-PLAYLIST-TYPE:VOD')
      expect(result).toContain('#EXTINF:6.000000,')
      expect(result).toContain('/stream-1/seg-000.ts')
      expect(result).toContain('#EXTINF:4.500000,')
      expect(result).toContain('/stream-1/seg-002.ts')
      expect(result).toContain('#EXT-X-ENDLIST')
    })

    it('should use custom version and target duration', () => {
      const segments: StreamSegment[] = [{ index: 0, duration: 10.0, uri: '/seg-0.ts' }]

      const result = generateMediaPlaylist(segments, {
        version: 7,
        targetDuration: 12,
      })

      expect(result).toContain('#EXT-X-VERSION:7')
      expect(result).toContain('#EXT-X-TARGETDURATION:12')
    })

    it('should use custom media sequence', () => {
      const segments: StreamSegment[] = [{ index: 5, duration: 6.0, uri: '/seg-5.ts' }]

      const result = generateMediaPlaylist(segments, { mediaSequence: 5 })

      expect(result).toContain('#EXT-X-MEDIA-SEQUENCE:5')
    })

    it('should support event playlist type', () => {
      const segments: StreamSegment[] = [{ index: 0, duration: 6.0, uri: '/seg-0.ts' }]

      const result = generateMediaPlaylist(segments, { playlistType: 'event' })

      expect(result).toContain('#EXT-X-PLAYLIST-TYPE:EVENT')
    })

    it('should handle empty segments', () => {
      const result = generateMediaPlaylist([])

      expect(result).toContain('#EXTM3U')
      expect(result).toContain('#EXT-X-TARGETDURATION:0')
      expect(result).toContain('#EXT-X-ENDLIST')
    })

    it('should calculate target duration from max segment duration', () => {
      const segments: StreamSegment[] = [
        { index: 0, duration: 5.5, uri: '/seg-0.ts' },
        { index: 1, duration: 8.3, uri: '/seg-1.ts' },
        { index: 2, duration: 6.0, uri: '/seg-2.ts' },
      ]

      const result = generateMediaPlaylist(segments)

      // Math.ceil(8.3) = 9
      expect(result).toContain('#EXT-X-TARGETDURATION:9')
    })
  })

  describe('generateMasterPlaylist', () => {
    it('should generate a valid master playlist', () => {
      const variants: TranscodeVariant[] = [
        {
          profile: '720p',
          uri: '/stream-1/720p/index.m3u8',
          width: 1280,
          height: 720,
          bitrate: 2_500_000,
        },
        {
          profile: '1080p',
          uri: '/stream-1/1080p/index.m3u8',
          width: 1920,
          height: 1080,
          bitrate: 5_000_000,
        },
      ]

      const result = generateMasterPlaylist(variants)

      expect(result).toContain('#EXTM3U')
      expect(result).toContain(
        '#EXT-X-STREAM-INF:BANDWIDTH=2500000,RESOLUTION=1280x720,NAME="720p"',
      )
      expect(result).toContain('/stream-1/720p/index.m3u8')
      expect(result).toContain(
        '#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080,NAME="1080p"',
      )
      expect(result).toContain('/stream-1/1080p/index.m3u8')
    })

    it('should handle a single variant', () => {
      const variants: TranscodeVariant[] = [
        {
          profile: '480p',
          uri: '/stream-1/480p/index.m3u8',
          width: 854,
          height: 480,
          bitrate: 1_000_000,
        },
      ]

      const result = generateMasterPlaylist(variants)

      expect(result).toContain('#EXTM3U')
      expect(result).toContain('#EXT-X-STREAM-INF:BANDWIDTH=1000000,RESOLUTION=854x480,NAME="480p"')
    })
  })
})
