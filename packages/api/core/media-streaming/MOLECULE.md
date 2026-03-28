# @molecule/api-media-streaming

Provider-agnostic media streaming interface for molecule.dev.

Defines the `StreamingProvider` interface for creating adaptive bitrate
streams, transcoding media into multiple quality variants, generating
manifests, and retrieving individual stream segments. Bond packages
(HLS, DASH, etc.) implement this interface. Application code uses the
convenience functions (`createStream`, `transcode`, `generateManifest`,
`getSegment`) which delegate to the bonded provider.

## Type
`core`

## Installation
```bash
npm install @molecule/api-media-streaming
```

## Usage

```typescript
import { setProvider, createStream, transcode } from '@molecule/api-media-streaming'
import { provider as hls } from '@molecule/api-media-streaming-hls'

setProvider(hls)

const manifest = await createStream('/path/to/video.mp4', {
  segmentDuration: 6,
  protocol: 'hls',
})

const result = await transcode('/path/to/video.mp4', [
  { name: '720p', width: 1280, height: 720, videoBitrate: 2_500_000, audioBitrate: 128_000 },
  { name: '1080p', width: 1920, height: 1080, videoBitrate: 5_000_000, audioBitrate: 192_000 },
])
```

## API

### Interfaces

#### `StreamingConfig`

Configuration options for media streaming providers.

```typescript
interface StreamingConfig {
  /** Default segment duration in seconds. */
  segmentDuration?: number

  /** Default streaming protocol. */
  protocol?: StreamProtocol

  /** Base path for output files. */
  outputBasePath?: string
}
```

#### `StreamingProvider`

Media streaming provider interface.

All media streaming providers must implement this interface. Bond packages
(HLS, DASH, etc.) provide concrete implementations.

```typescript
interface StreamingProvider {
  /**
   * Creates a stream from a media source.
   *
   * @param input - The source media as a Buffer or file path.
   * @param options - Optional streaming configuration.
   * @returns A manifest describing the generated stream.
   */
  createStream(input: Buffer | string, options?: StreamOptions): Promise<StreamManifest>

  /**
   * Transcodes a media source into multiple quality variants.
   *
   * @param input - The source media as a Buffer or file path.
   * @param profiles - One or more target quality profiles.
   * @returns The aggregated transcode result with variant URIs.
   */
  transcode(input: Buffer | string, profiles: TranscodeProfile[]): Promise<TranscodeResult>

  /**
   * Generates a playlist / manifest string from a list of segments.
   *
   * @param segments - Ordered stream segments.
   * @param options - Optional streaming configuration.
   * @returns The manifest content as a string (e.g. M3U8 or MPD).
   */
  generateManifest(segments: StreamSegment[], options?: StreamOptions): string

  /**
   * Retrieves a specific segment of a stream.
   *
   * @param streamId - The stream identifier.
   * @param segmentIndex - Zero-based index of the segment.
   * @returns The raw segment data.
   */
  getSegment(streamId: string, segmentIndex: number): Promise<Buffer>
}
```

#### `StreamManifest`

Manifest describing a generated stream.

```typescript
interface StreamManifest {
  /** Unique stream identifier. */
  id: string

  /** The streaming protocol used. */
  protocol: StreamProtocol

  /** URI of the manifest / playlist file (e.g. `.m3u8` or `.mpd`). */
  manifestUri: string

  /** Total duration of the stream in seconds. */
  duration: number

  /** Ordered list of segments that compose the stream. */
  segments: StreamSegment[]
}
```

#### `StreamOptions`

Options for creating a stream from a source file.

```typescript
interface StreamOptions {
  /** Target segment duration in seconds. Defaults to `6`. */
  segmentDuration?: number

  /** Streaming protocol to use. Defaults to `'hls'`. */
  protocol?: StreamProtocol

  /** Output directory or bucket path for generated segments. */
  outputPath?: string
}
```

#### `StreamSegment`

A single segment of a media stream (e.g. an HLS `.ts` chunk).

```typescript
interface StreamSegment {
  /** Zero-based index of the segment within the stream. */
  index: number

  /** Duration of the segment in seconds. */
  duration: number

  /** URI to access the segment (relative or absolute). */
  uri: string
}
```

#### `TranscodeProfile`

A transcoding profile describing the desired output quality.

```typescript
interface TranscodeProfile {
  /** Human-readable name for the profile (e.g. `'720p'`). */
  name: string

  /** Target video width in pixels. */
  width: number

  /** Target video height in pixels. */
  height: number

  /** Target video bitrate in bits per second. */
  videoBitrate: number

  /** Target audio bitrate in bits per second. */
  audioBitrate: number

  /** Video codec to use (e.g. `'h264'`, `'vp9'`). */
  codec?: string
}
```

#### `TranscodeResult`

Aggregated result of a multi-profile transcoding operation.

```typescript
interface TranscodeResult {
  /** Unique identifier for the transcode job. */
  id: string

  /** URI to the master manifest (adaptive bitrate). */
  masterManifestUri: string

  /** Individual variant results. */
  variants: TranscodeVariant[]
}
```

#### `TranscodeVariant`

Result of a transcoding operation for a single profile.

```typescript
interface TranscodeVariant {
  /** Profile name used for this variant. */
  profile: string

  /** URI to the transcoded output. */
  uri: string

  /** Output width in pixels. */
  width: number

  /** Output height in pixels. */
  height: number

  /** Output bitrate in bits per second. */
  bitrate: number
}
```

### Types

#### `StreamProtocol`

Supported streaming protocol.

```typescript
type StreamProtocol = 'hls' | 'dash'
```

#### `StreamStatus`

Status of a streaming session.

```typescript
type StreamStatus = 'pending' | 'processing' | 'ready' | 'error'
```

### Functions

#### `createStream(input, options)`

Creates a stream from a media source.

```typescript
function createStream(input: string | Buffer<ArrayBufferLike>, options?: StreamOptions): Promise<StreamManifest>
```

- `input` — The source media as a Buffer or file path.
- `options` — Optional streaming configuration.

**Returns:** A manifest describing the generated stream.

#### `generateManifest(segments, options)`

Generates a playlist / manifest string from a list of segments.

```typescript
function generateManifest(segments: StreamSegment[], options?: StreamOptions): string
```

- `segments` — Ordered stream segments.
- `options` — Optional streaming configuration.

**Returns:** The manifest content as a string (e.g. M3U8 or MPD).

#### `getProvider()`

Retrieves the bonded media streaming provider, throwing if none is configured.

```typescript
function getProvider(): StreamingProvider
```

**Returns:** The bonded media streaming provider.

#### `getSegment(streamId, segmentIndex)`

Retrieves a specific segment of a stream.

```typescript
function getSegment(streamId: string, segmentIndex: number): Promise<Buffer<ArrayBufferLike>>
```

- `streamId` — The stream identifier.
- `segmentIndex` — Zero-based index of the segment.

**Returns:** The raw segment data.

#### `hasProvider()`

Checks whether a media streaming provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a media streaming provider is bonded.

#### `setProvider(provider)`

Registers a media streaming provider as the active singleton. Called by bond
packages during application startup.

```typescript
function setProvider(provider: StreamingProvider): void
```

- `provider` — The media streaming provider implementation to bond.

#### `transcode(input, profiles)`

Transcodes a media source into multiple quality variants.

```typescript
function transcode(input: string | Buffer<ArrayBufferLike>, profiles: TranscodeProfile[]): Promise<TranscodeResult>
```

- `input` — The source media as a Buffer or file path.
- `profiles` — One or more target quality profiles.

**Returns:** The aggregated transcode result with variant URIs.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
