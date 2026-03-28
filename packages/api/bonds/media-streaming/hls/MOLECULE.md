# @molecule/api-media-streaming-hls

HLS media streaming provider for molecule.dev.

Provides HLS (HTTP Live Streaming) support via ffmpeg for media segmentation
and transcoding, with pure-TypeScript M3U8 playlist generation. Requires
ffmpeg to be installed on the host system.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-media-streaming-hls
```

## Usage

```typescript
import { setProvider, createStream } from '@molecule/api-media-streaming'
import { provider } from '@molecule/api-media-streaming-hls'

setProvider(provider)

const manifest = await createStream('/path/to/video.mp4', {
  segmentDuration: 6,
  protocol: 'hls',
})
console.log(manifest.manifestUri) // '/hls-…/index.m3u8'
```

## API

### Interfaces

#### `HlsConfig`

Configuration options for the HLS streaming provider.

```typescript
interface HlsConfig {
  /** Path to the ffmpeg binary. Defaults to `'ffmpeg'` (resolved via PATH). */
  ffmpegPath?: string

  /** Path to the ffprobe binary. Defaults to `'ffprobe'` (resolved via PATH). */
  ffprobePath?: string

  /** Base directory where stream output files are written. Defaults to `os.tmpdir()`. */
  outputBasePath?: string

  /** Default segment duration in seconds. Defaults to `6`. */
  segmentDuration?: number

  /** HLS playlist version. Defaults to `3`. */
  hlsVersion?: number
}
```

#### `M3u8PlaylistOptions`

Options for generating an M3U8 media playlist.

```typescript
interface M3u8PlaylistOptions {
  /** HLS playlist version. Defaults to `3`. */
  version?: number

  /** Target segment duration in seconds. Defaults to the maximum segment duration. */
  targetDuration?: number

  /** Whether this is a VOD (complete) or live (in-progress) playlist. Defaults to `'vod'`. */
  playlistType?: 'vod' | 'event'

  /** Media sequence number for the first segment. Defaults to `0`. */
  mediaSequence?: number
}
```

### Functions

#### `createProvider(config)`

Creates an HLS streaming provider.

```typescript
function createProvider(config?: HlsConfig): StreamingProvider
```

- `config` — Optional provider configuration.

**Returns:** A `StreamingProvider` backed by HLS / ffmpeg.

#### `generateMasterPlaylist(variants)`

Generates an M3U8 master playlist for adaptive bitrate streaming.

```typescript
function generateMasterPlaylist(variants: TranscodeVariant[]): string
```

- `variants` — The transcoded variant streams.

**Returns:** The master M3U8 playlist content as a string.

#### `generateMediaPlaylist(segments, options)`

Generates an M3U8 media playlist from a list of stream segments.

```typescript
function generateMediaPlaylist(segments: StreamSegment[], options?: M3u8PlaylistOptions): string
```

- `segments` — Ordered list of stream segments.
- `options` — Playlist generation options.

**Returns:** The M3U8 playlist content as a string.

### Constants

#### `provider`

The provider implementation with default configuration.

```typescript
const provider: StreamingProvider
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-media-streaming` ^1.0.0
