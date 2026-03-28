/**
 * Pure-TypeScript M3U8 (HLS playlist) generation utilities.
 *
 * Generates Media Playlists, Master Playlists (adaptive bitrate), and
 * parses segment metadata — all without external dependencies.
 *
 * @module
 */

import type { StreamSegment, TranscodeVariant } from '@molecule/api-media-streaming'

/**
 * Options for generating an M3U8 media playlist.
 */
export interface M3u8PlaylistOptions {
  /** HLS playlist version. Defaults to `3`. */
  version?: number

  /** Target segment duration in seconds. Defaults to the maximum segment duration. */
  targetDuration?: number

  /** Whether this is a VOD (complete) or live (in-progress) playlist. Defaults to `'vod'`. */
  playlistType?: 'vod' | 'event'

  /** Media sequence number for the first segment. Defaults to `0`. */
  mediaSequence?: number
}

/**
 * Generates an M3U8 media playlist from a list of stream segments.
 *
 * @param segments - Ordered list of stream segments.
 * @param options - Playlist generation options.
 * @returns The M3U8 playlist content as a string.
 */
export const generateMediaPlaylist = (
  segments: StreamSegment[],
  options: M3u8PlaylistOptions = {},
): string => {
  const version = options.version ?? 3
  const targetDuration =
    options.targetDuration ?? Math.ceil(Math.max(...segments.map((s) => s.duration), 0))
  const mediaSequence = options.mediaSequence ?? 0
  const playlistType = options.playlistType ?? 'vod'

  const lines: string[] = [
    '#EXTM3U',
    `#EXT-X-VERSION:${version}`,
    `#EXT-X-TARGETDURATION:${targetDuration}`,
    `#EXT-X-MEDIA-SEQUENCE:${mediaSequence}`,
    `#EXT-X-PLAYLIST-TYPE:${playlistType.toUpperCase()}`,
  ]

  for (const segment of segments) {
    lines.push(`#EXTINF:${segment.duration.toFixed(6)},`)
    lines.push(segment.uri)
  }

  lines.push('#EXT-X-ENDLIST')
  lines.push('')

  return lines.join('\n')
}

/**
 * Generates an M3U8 master playlist for adaptive bitrate streaming.
 *
 * @param variants - The transcoded variant streams.
 * @returns The master M3U8 playlist content as a string.
 */
export const generateMasterPlaylist = (variants: TranscodeVariant[]): string => {
  const lines: string[] = ['#EXTM3U']

  for (const variant of variants) {
    lines.push(
      `#EXT-X-STREAM-INF:BANDWIDTH=${variant.bitrate},RESOLUTION=${variant.width}x${variant.height},NAME="${variant.profile}"`,
    )
    lines.push(variant.uri)
  }

  lines.push('')

  return lines.join('\n')
}
