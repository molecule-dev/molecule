/**
 * HLS media streaming provider for molecule.dev.
 *
 * Provides HLS (HTTP Live Streaming) support via ffmpeg for media segmentation
 * and transcoding, with pure-TypeScript M3U8 playlist generation. Requires
 * ffmpeg to be installed on the host system.
 *
 * @example
 * ```typescript
 * import { setProvider, createStream } from '@molecule/api-media-streaming'
 * import { provider } from '@molecule/api-media-streaming-hls'
 *
 * setProvider(provider)
 *
 * const manifest = await createStream('/path/to/video.mp4', {
 *   segmentDuration: 6,
 *   protocol: 'hls',
 * })
 * console.log(manifest.manifestUri) // '/hls-…/index.m3u8'
 * ```
 *
 * @module
 */

export * from './m3u8.js'
export * from './provider.js'
export * from './types.js'
