/**
 * Provider-agnostic media streaming interface for molecule.dev.
 *
 * Defines the `StreamingProvider` interface for creating adaptive bitrate
 * streams, transcoding media into multiple quality variants, generating
 * manifests, and retrieving individual stream segments. Bond packages
 * (HLS, DASH, etc.) implement this interface. Application code uses the
 * convenience functions (`createStream`, `transcode`, `generateManifest`,
 * `getSegment`) which delegate to the bonded provider.
 *
 * @example
 * ```typescript
 * import { setProvider, createStream, transcode } from '@molecule/api-media-streaming'
 * import { provider as hls } from '@molecule/api-media-streaming-hls'
 *
 * setProvider(hls)
 *
 * const manifest = await createStream('/path/to/video.mp4', {
 *   segmentDuration: 6,
 *   protocol: 'hls',
 * })
 *
 * const result = await transcode('/path/to/video.mp4', [
 *   { name: '720p', width: 1280, height: 720, videoBitrate: 2_500_000, audioBitrate: 128_000 },
 *   { name: '1080p', width: 1920, height: 1080, videoBitrate: 5_000_000, audioBitrate: 192_000 },
 * ])
 * ```
 *
 * @module
 */

// Type exports
export * from './types.js'

// Provider exports
export * from './provider.js'
